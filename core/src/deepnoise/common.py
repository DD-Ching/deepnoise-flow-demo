from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundfile as sf

TARGET_SR = 48_000


@dataclass
class PreparedAudio:
    path: str
    _tmp: tempfile.TemporaryDirectory | None = None

    def cleanup(self) -> None:
        if self._tmp is not None:
            self._tmp.cleanup()

    def __enter__(self) -> "PreparedAudio":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.cleanup()


def detect_audio_format(path: str) -> str:
    suffix = Path(path).suffix.lower().lstrip(".")
    return suffix or "unknown"


def _ffmpeg_install_hint() -> str:
    return (
        "FFmpeg was not found in your PATH.\n"
        "Install it and retry:\n"
        "  macOS (Homebrew): brew install ffmpeg\n"
        "  Windows (winget): winget install Gyan.FFmpeg\n"
        "  Linux (Debian/Ubuntu): sudo apt-get install ffmpeg\n"
    )


def _require_ffmpeg() -> str:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        message = _ffmpeg_install_hint()
        print(message, file=sys.stderr)
        raise RuntimeError(message)
    return ffmpeg


def convert_with_ffmpeg(input_path: str, output_path: str | Path, target_sr: int = TARGET_SR) -> None:
    source = Path(input_path)
    if not source.exists():
        raise FileNotFoundError(f"Input audio not found: {input_path}")

    ffmpeg = _require_ffmpeg()
    _ = detect_audio_format(input_path)
    out_path = Path(output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(source),
        "-ar",
        str(target_sr),
        "-ac",
        "1",
        "-sample_fmt",
        "s16",
        str(out_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        raise RuntimeError(f"FFmpeg failed to convert input: {detail}")


def prepare_audio_for_model(input_path: str, target_sr: int = TARGET_SR) -> PreparedAudio:
    source = Path(input_path)
    if not source.exists():
        raise FileNotFoundError(f"Input audio not found: {input_path}")

    tmp = tempfile.TemporaryDirectory(prefix="deepnoise_ffmpeg_")
    out_path = Path(tmp.name) / f"{source.stem}_converted.wav"
    try:
        convert_with_ffmpeg(str(source), out_path, target_sr=target_sr)
    except Exception:
        tmp.cleanup()
        raise

    return PreparedAudio(path=str(out_path), _tmp=tmp)


def to_mono(audio: np.ndarray) -> np.ndarray:
    """Convert [N, C] or [N] audio to mono [N]."""
    if audio.ndim == 1:
        return audio.astype(np.float32)
    return audio.mean(axis=1).astype(np.float32)


def resample_audio(audio: np.ndarray, src_sr: int, dst_sr: int = TARGET_SR) -> np.ndarray:
    """Resample audio with polyphase filtering for high quality."""
    if src_sr == dst_sr:
        return audio.astype(np.float32)
    # Import lazily to keep module import fast (helps UI startup time).
    from scipy.signal import resample_poly
    gcd = np.gcd(src_sr, dst_sr)
    up = dst_sr // gcd
    down = src_sr // gcd
    return resample_poly(audio, up, down).astype(np.float32)


def load_wav(path: str, target_sr: int = TARGET_SR) -> tuple[np.ndarray, int]:
    audio, sr = sf.read(path, always_2d=False)
    audio = to_mono(audio)
    audio = resample_audio(audio, sr, target_sr)
    audio = np.clip(audio, -1.0, 1.0)
    return audio, target_sr


def save_wav_16bit(path: str, audio: np.ndarray, sr: int = TARGET_SR) -> None:
    clipped = np.clip(audio, -1.0, 1.0)
    sf.write(path, clipped, sr, subtype="PCM_16")
