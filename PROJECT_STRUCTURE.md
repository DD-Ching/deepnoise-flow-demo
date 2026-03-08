# Project Structure

This repository is organized so the core audio engine is independent from the demo UI.

## Top-Level Layout

```text
DeepNoise/
├─ core/                         # Core runtime (backend API + pipeline engine)
│  ├─ api_server.py              # FastAPI service and safety guards
│  ├─ main.py                    # CLI entry for batch pipeline runs
│  └─ src/
│     ├─ deepnoise/
│     │  ├─ models/              # Built-in model plugins + registry + base interface
│     │  ├─ workflow/            # Node execution modules and workflow runner
│     │  ├─ pipeline.py          # Backward-compatible workflow facade
│     │  └─ ...
│     └─ separation/             # Speaker separation implementation
├─ models/                       # External user plugins (*.py) auto-discovered at runtime
├─ ui/                           # React-based node editor (optional showcase)
├─ demo/                         # Static showcase page (optional)
├─ scripts/                      # Security scan, release helpers, utility scripts
├─ run.sh                        # Single command launcher (core/demo mode)
├─ README.md
├─ MODEL_INTERFACE.md
└─ PROJECT_STRUCTURE.md
```

## Separation of Concerns

- `core/` does not depend on `demo/`.
- `core/` can run without `ui/` by using API or CLI.
- `models/` can extend behavior without changing pipeline internals.
- `ui/` and `demo/` are presentation layers only.

## Runtime Modes

- Core-only mode: `./run.sh core`
- Demo mode: `./run.sh demo`

Both modes use local configuration and do not require hard-coded remote URLs.

## Configuration

Environment variables provide explicit runtime configuration. Common settings include:

- API limits and safety: `DEEPNOISE_MAX_UPLOAD_BYTES`, `DEEPNOISE_MAX_AUDIO_SECONDS`, `DEEPNOISE_RATE_LIMIT_PER_MINUTE`
- Concurrency and timeout: `DEEPNOISE_MAX_CONCURRENT_JOBS`, `DEEPNOISE_MAX_QUEUED_JOBS`, `DEEPNOISE_PROCESSING_TIMEOUT_SECONDS`
- Model behavior: `DEEPNOISE_DEFAULT_DENOISE_MODEL`, `DEEPNOISE_DEFAULT_SEPARATION_MODEL`, `DEEPNOISE_ENABLE_MODEL_FALLBACK`, `DEEPNOISE_FALLBACK_MODEL_NAME`

## Extension Entry Points

- Add a new backend model plugin: `models/*.py` (see `MODEL_INTERFACE.md`)
- Add a new workflow node type: `core/src/deepnoise/workflow/node_modules.py`
- Add a UI node/editor control: `ui/src/nodes` and `ui/src/components`
