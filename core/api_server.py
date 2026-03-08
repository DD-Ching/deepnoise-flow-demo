from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import tempfile
import time
import uuid
from collections import defaultdict, deque
from pathlib import Path
import sys

import socketio
import torchaudio
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

APP_ROOT = Path(__file__).parent
PROJECT_ROOT = APP_ROOT.parent
SRC_ROOT = APP_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from deepnoise.common import prepare_audio_for_model
from deepnoise.models import list_registered_models
from deepnoise.pipeline import run_workflow

OUTPUT_ROOT = Path(os.getenv("DEEPNOISE_OUTPUT_ROOT", PROJECT_ROOT / "output_runs")).resolve()
OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
OUTPUT_ROOT_RESOLVED = OUTPUT_ROOT.resolve()

MAX_UPLOAD_BYTES = int(os.getenv("DEEPNOISE_MAX_UPLOAD_BYTES", 10 * 1024 * 1024))
MAX_AUDIO_SECONDS = float(os.getenv("DEEPNOISE_MAX_AUDIO_SECONDS", 30))
RATE_LIMIT_PER_MINUTE = int(os.getenv("DEEPNOISE_RATE_LIMIT_PER_MINUTE", 6))
REQUEST_THROTTLE_SECONDS = float(os.getenv("DEEPNOISE_REQUEST_THROTTLE_SECONDS", 2))
MAX_CONCURRENT_JOBS = int(os.getenv("DEEPNOISE_MAX_CONCURRENT_JOBS", 2))
MAX_QUEUED_JOBS = int(os.getenv("DEEPNOISE_MAX_QUEUED_JOBS", 4))
PROCESSING_TIMEOUT_SECONDS = int(os.getenv("DEEPNOISE_PROCESSING_TIMEOUT_SECONDS", 120))
MAX_IN_FLIGHT_JOBS = MAX_CONCURRENT_JOBS + MAX_QUEUED_JOBS

ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".webm"}
ALLOWED_AUDIO_CONTENT_TYPES = {
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/webm",
    "video/webm",
}
RUN_ID_PATTERN = re.compile(r"^[a-f0-9]{10}$")
SAFE_FILENAME_PATTERN = re.compile(r"^[a-zA-Z0-9._-]+$")

ip_request_windows: dict[str, deque[float]] = defaultdict(deque)
ip_last_request_at: dict[str, float] = {}
rate_limit_lock = asyncio.Lock()

in_flight_jobs = 0
in_flight_lock = asyncio.Lock()
job_semaphore = asyncio.Semaphore(MAX_CONCURRENT_JOBS)

fastapi_app = FastAPI()
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)


def error_response(message: str, status_code: int, **extra):
    payload = {"error": message}
    payload.update(extra)
    return JSONResponse(payload, status_code=status_code)


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        first_hop = forwarded_for.split(",")[0].strip()
        if first_hop:
            return first_hop
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


async def enforce_request_rate_limits(client_ip: str):
    now = time.monotonic()
    window_start = now - 60
    async with rate_limit_lock:
        requests_in_window = ip_request_windows[client_ip]
        while requests_in_window and requests_in_window[0] < window_start:
            requests_in_window.popleft()

        last_request_at = ip_last_request_at.get(client_ip)
        if last_request_at is not None:
            delta = now - last_request_at
            if delta < REQUEST_THROTTLE_SECONDS:
                retry_after = max(1, int(REQUEST_THROTTLE_SECONDS - delta) + 1)
                return error_response(
                    "You're sending requests too quickly. Please wait a moment and try again.",
                    status_code=429,
                    retry_after_seconds=retry_after,
                )

        if len(requests_in_window) >= RATE_LIMIT_PER_MINUTE:
            retry_after = max(1, int(60 - (now - requests_in_window[0])) + 1)
            return error_response(
                "Rate limit exceeded. Please wait and try again.",
                status_code=429,
                retry_after_seconds=retry_after,
            )

        requests_in_window.append(now)
        ip_last_request_at[client_ip] = now
    return None


def validate_upload_metadata(audio: UploadFile):
    filename = Path(audio.filename or "").name
    if not filename:
        return error_response("Please upload an audio file.", status_code=400)

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        return error_response(
            "Unsupported file type. Please upload WAV, MP3, or WEBM audio.",
            status_code=415,
            allowed=list(sorted(ALLOWED_AUDIO_EXTENSIONS)),
        )

    content_type = (audio.content_type or "").lower()
    if content_type and content_type not in ALLOWED_AUDIO_CONTENT_TYPES:
        return error_response(
            "Unsupported content type. Please upload WAV, MP3, or WEBM audio.",
            status_code=415,
            allowed_content_types=list(sorted(ALLOWED_AUDIO_CONTENT_TYPES)),
        )

    return None


async def save_upload_with_size_limit(audio: UploadFile, destination: Path):
    size_bytes = 0
    chunk_size = 1024 * 1024
    with destination.open("wb") as buffer:
        while True:
            chunk = await audio.read(chunk_size)
            if not chunk:
                break
            size_bytes += len(chunk)
            if size_bytes > MAX_UPLOAD_BYTES:
                return False, size_bytes
            buffer.write(chunk)
    return True, size_bytes


def get_audio_duration_seconds(path: Path):
    try:
        metadata = torchaudio.info(str(path))
        if metadata.sample_rate <= 0 or metadata.num_frames <= 0:
            return None
        return float(metadata.num_frames) / float(metadata.sample_rate)
    except Exception:
        return None


def execute_workflow(
    *,
    nodes,
    edges,
    input_path: Path,
    tmpdir_path: Path,
    run_dir: Path,
    target_node_id: str | None,
):
    with prepare_audio_for_model(str(input_path)) as prepared:
        prepared_path = Path(prepared.path)
        return run_workflow(
            nodes=nodes,
            edges=edges,
            prepared_path=prepared_path,
            tmpdir_path=tmpdir_path,
            run_dir=run_dir,
            target_node_id=target_node_id,
        )


async def try_reserve_queue_slot():
    global in_flight_jobs
    async with in_flight_lock:
        if in_flight_jobs >= MAX_IN_FLIGHT_JOBS:
            return False
        in_flight_jobs += 1
        return True


async def release_queue_slot():
    global in_flight_jobs
    async with in_flight_lock:
        in_flight_jobs = max(0, in_flight_jobs - 1)


@fastapi_app.post("/api/run_pipeline")
async def run_pipeline(
    request: Request,
    workflow: str = Form(...),
    audio: UploadFile = File(...),
    target_node_id: str | None = Form(None),
):
    client_ip = get_client_ip(request)

    rate_limited_response = await enforce_request_rate_limits(client_ip)
    if rate_limited_response:
        return rate_limited_response

    upload_validation_error = validate_upload_metadata(audio)
    if upload_validation_error:
        return upload_validation_error

    slot_reserved = await try_reserve_queue_slot()
    if not slot_reserved:
        return error_response(
            "The service is currently busy. Please try again in a minute.",
            status_code=503,
        )

    try:
        try:
            workflow_json = json.loads(workflow)
        except json.JSONDecodeError:
            return error_response("Invalid workflow JSON.", status_code=400)

        nodes = workflow_json.get("nodes", [])
        edges = workflow_json.get("edges", [])
        run_id = uuid.uuid4().hex[:10]
        run_dir = OUTPUT_ROOT / run_id
        run_dir.mkdir(parents=True, exist_ok=True)

        with tempfile.TemporaryDirectory(prefix="deepnoise_api_") as tmpdir:
            tmpdir_path = Path(tmpdir)
            filename = Path(audio.filename or f"input_{run_id}.wav").name
            input_path = tmpdir_path / filename

            saved_ok, size_bytes = await save_upload_with_size_limit(audio, input_path)
            if not saved_ok:
                shutil.rmtree(run_dir, ignore_errors=True)
                return error_response(
                    f"Upload too large. Max size is {MAX_UPLOAD_BYTES // (1024 * 1024)}MB.",
                    status_code=413,
                )

            if size_bytes <= 0:
                shutil.rmtree(run_dir, ignore_errors=True)
                return error_response("Uploaded file is empty.", status_code=400)

            duration_seconds = await asyncio.to_thread(get_audio_duration_seconds, input_path)
            if duration_seconds is None:
                shutil.rmtree(run_dir, ignore_errors=True)
                return error_response(
                    "Unable to read audio metadata. Please upload a valid WAV, MP3, or WEBM file.",
                    status_code=400,
                )
            if duration_seconds > MAX_AUDIO_SECONDS:
                shutil.rmtree(run_dir, ignore_errors=True)
                return error_response(
                    f"Audio is too long. Maximum duration is {int(MAX_AUDIO_SECONDS)} seconds.",
                    status_code=413,
                    duration_seconds=round(duration_seconds, 2),
                )

            await job_semaphore.acquire()
            try:
                outputs_payload, node_outputs_payload = await asyncio.wait_for(
                    asyncio.to_thread(
                        execute_workflow,
                        nodes=nodes,
                        edges=edges,
                        input_path=input_path,
                        tmpdir_path=tmpdir_path,
                        run_dir=run_dir,
                        target_node_id=target_node_id,
                    ),
                    timeout=PROCESSING_TIMEOUT_SECONDS,
                )
            except asyncio.TimeoutError:
                shutil.rmtree(run_dir, ignore_errors=True)
                return error_response(
                    "Processing timed out. Please try a shorter clip or try again later.",
                    status_code=504,
                )
            except ValueError as exc:
                shutil.rmtree(run_dir, ignore_errors=True)
                return error_response(str(exc), status_code=400)
            except Exception:
                shutil.rmtree(run_dir, ignore_errors=True)
                return error_response(
                    "Processing failed unexpectedly. Please try again later.",
                    status_code=500,
                )
            finally:
                job_semaphore.release()

            return {
                "run_id": run_id,
                "outputs": outputs_payload,
                "node_outputs": node_outputs_payload,
            }
    finally:
        await audio.close()
        await release_queue_slot()


@fastapi_app.get("/api/models")
def get_models():
    return {"models": list_registered_models()}


@fastapi_app.get("/api/output/{run_id}/{filename}")
def get_output(run_id: str, filename: str):
    if not RUN_ID_PATTERN.fullmatch(run_id):
        return error_response("Invalid run id.", status_code=400)

    safe_name = Path(filename).name
    if safe_name != filename or not SAFE_FILENAME_PATTERN.fullmatch(safe_name):
        return error_response("Invalid filename.", status_code=400)

    path = (OUTPUT_ROOT / run_id / safe_name).resolve()
    if OUTPUT_ROOT_RESOLVED not in path.parents:
        return error_response("Invalid path.", status_code=400)

    if not path.exists():
        return error_response("File not found.", status_code=404)

    return FileResponse(path)


@sio.event
async def connect(sid, environ):
    await sio.emit("status", {"state": "connected"}, to=sid)


@sio.event
async def disconnect(sid):
    return


@sio.event
async def audio_chunk(sid, data):
    # Placeholder: echo raw audio frames back until realtime processing is wired.
    await sio.emit("audio_processed", data, to=sid)
