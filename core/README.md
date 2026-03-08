# Core Runtime

This directory contains the independent backend/runtime system for DeepNoise Flow.

## Contents

- `api_server.py`: FastAPI + Socket.IO service
- `main.py`: CLI runner
- `src/deepnoise`: workflow engine, model registry, pipeline modules
- `src/separation`: separation model integration

## Run API directly

```bash
PYTHONPATH=core/src python -m uvicorn core.api_server:app --host 127.0.0.1 --port 8000
```

## Run CLI directly

```bash
python core/main.py --input sample.wav --mode denoise_only --output clean.wav
```
