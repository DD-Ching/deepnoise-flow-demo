# Deployment Environment Variables

Do not commit real secret values.

## Backend (`core/api_server.py`)

- `DEEPNOISE_MAX_UPLOAD_BYTES` (default: `10485760`)
- `DEEPNOISE_MAX_AUDIO_SECONDS` (default: `30`)
- `DEEPNOISE_RATE_LIMIT_PER_MINUTE` (default: `6`)
- `DEEPNOISE_REQUEST_THROTTLE_SECONDS` (default: `2`)
- `DEEPNOISE_MAX_CONCURRENT_JOBS` (default: `2`)
- `DEEPNOISE_MAX_QUEUED_JOBS` (default: `4`)
- `DEEPNOISE_PROCESSING_TIMEOUT_SECONDS` (default: `120`)
- `DEEPNOISE_OUTPUT_ROOT` (default: `./output_runs`)
- `DEEPNOISE_EXTERNAL_MODELS_DIR` (optional override for plugin directory)

## Runner (`run.sh`)

- `DEEPNOISE_API_HOST` (default: `127.0.0.1`)
- `DEEPNOISE_API_PORT` (default: `8000`)
- `DEEPNOISE_UI_HOST` (default: `127.0.0.1`)
- `DEEPNOISE_UI_PORT` (default: `5173`)
- `DEEPNOISE_DEMO_PORT` (default: `8080`)

## UI (`ui`)

- `VITE_API_BASE_URL` (optional API base URL for browser runtime)
- `DEEPNOISE_API_PROXY_TARGET` (optional Vite dev proxy target)
