# DeepNoise Flow

DeepNoise Flow is a personal showcase project for node-based audio processing workflows.

## Documentation Index

- `PROJECT_STRUCTURE.md`: repository boundaries and runtime modes
- `MODEL_INTERFACE.md`: plugin API contract for models
- `MODEL_EXTENSION_GUIDE.md`: practical extension walkthrough
- `PUBLIC_RELEASE_PLAN.md`: safe public-release workflow

## Repository Layout

```text
DeepNoise/
├─ core/                   # Core runtime (independent of demo/UI)
│  ├─ api_server.py        # FastAPI + Socket.IO service
│  ├─ main.py              # CLI pipeline runner
│  └─ src/                 # Python packages (deepnoise, separation)
├─ models/                 # Optional external model plugins (*.py)
├─ ui/                     # Interactive ReactFlow editor (optional)
├─ demo/                   # Static showcase site (optional)
├─ scripts/                # Utility scripts (security scan, release, etc.)
├─ run.sh                  # Single entry point (core/demo mode)
├─ api_server.py           # Compatibility wrapper -> core.api_server
├─ main.py                 # Compatibility wrapper -> core.main
└─ requirements.txt
```

## Core vs Demo

- `core/` is the real system and can run by itself.
- `ui/` and `demo/` are optional showcase layers.
- Removing `demo/` does not break backend processing.

## Modular Model System

- Base interface: `core/src/deepnoise/models/base_model.py`
- Registry and discovery: `core/src/deepnoise/models/registry.py`
- Built-in plugins: `core/src/deepnoise/models/*.py`
- External plugin folder: `models/*.py`

Runtime discovery:

1. Built-in models are loaded from `core/src/deepnoise/models/`.
2. External models are loaded from `./models/`.
3. You can override external plugin dir with `DEEPNOISE_EXTERNAL_MODELS_DIR`.

## One-Command Startup

### Demo mode (API + UI + showcase)

```bash
./run.sh demo
```

### Core mode (API only)

```bash
./run.sh core
```

`run.sh` will:

- stop previous instances on configured ports
- clean `.runlogs/*.log` and `.runlogs/*.pid`
- start backend API
- optionally start `ui` and `demo` in demo mode

## Environment Configuration

### Backend

- `DEEPNOISE_MAX_UPLOAD_BYTES` (default `10485760`)
- `DEEPNOISE_MAX_AUDIO_SECONDS` (default `30`)
- `DEEPNOISE_RATE_LIMIT_PER_MINUTE` (default `6`)
- `DEEPNOISE_REQUEST_THROTTLE_SECONDS` (default `2`)
- `DEEPNOISE_MAX_CONCURRENT_JOBS` (default `2`)
- `DEEPNOISE_MAX_QUEUED_JOBS` (default `4`)
- `DEEPNOISE_PROCESSING_TIMEOUT_SECONDS` (default `120`)
- `DEEPNOISE_OUTPUT_ROOT` (default `./output_runs`)
- `DEEPNOISE_DEFAULT_DENOISE_MODEL` (default `deepfilternet`)
- `DEEPNOISE_DEFAULT_SEPARATION_MODEL` (default `sepformer`)
- `DEEPNOISE_ENABLE_MODEL_FALLBACK` (default `1`)
- `DEEPNOISE_FALLBACK_MODEL_NAME` (default `example_passthrough`)

### Runtime ports and hosts (`run.sh`)

- `DEEPNOISE_API_HOST` / `DEEPNOISE_API_PORT`
- `DEEPNOISE_UI_HOST` / `DEEPNOISE_UI_PORT`
- `DEEPNOISE_DEMO_PORT`
- `DEEPNOISE_AUTO_INSTALL_DEPS` (default `1`, auto-install Python deps when missing)

### UI

- `VITE_API_BASE_URL` (optional; no hardcoded remote demo URL required)
- `DEEPNOISE_API_PROXY_TARGET` for Vite dev proxy target

## API

- `POST /api/run_pipeline`
- `GET /api/output/{run_id}/{filename}`
- `GET /api/models`

## CLI

Compatibility wrapper remains available:

```bash
python main.py --input sample.wav --mode denoise_only --denoise-model deepfilternet --output clean.wav
```

Direct core entry is also available:

```bash
python core/main.py --input sample.wav --mode denoise_and_separate --output_dir output
```

## Add New Models

1. Add a new plugin file in `models/` (for example `models/my_custom_model.py`).
2. Implement `BaseAudioModel` with `MODEL_NAME`, `load()`, `process()`, and `release()`.
3. Start API and verify discovery:

```bash
curl http://127.0.0.1:8000/api/models
```

See `MODEL_INTERFACE.md` for the exact interface contract.

## Security and Release

- `./scripts/security_scan.sh`
- `./scripts/public_release_check.sh`
- `./scripts/create_public_release_repo.sh ../DeepNoise-public`

Use fresh-history publication for public release safety (see `PUBLIC_RELEASE_PLAN.md`).
