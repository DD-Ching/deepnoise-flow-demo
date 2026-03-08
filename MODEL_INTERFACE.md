# Model Interface

DeepNoise models are plugins implementing a shared interface so they can be swapped without changing API routes or workflow orchestration.

## Base Interface

All model plugins must inherit from `BaseAudioModel` in:

- `core/src/deepnoise/models/base_model.py`

Required lifecycle:

1. `load()`
2. `process(request)`
3. `release()`

Minimal contract:

```python
from deepnoise.models.base_model import BaseAudioModel, ModelProcessRequest

class MyModel(BaseAudioModel):
    MODEL_NAME = "my_model"

    def load(self) -> None:
        # optional resource init
        return None

    def process(self, request: ModelProcessRequest) -> dict[str, str]:
        # run inference and return named output paths
        # at least {"audio": "/path/to/output.wav"} is recommended
        ...

    def release(self) -> None:
        # optional cleanup
        return None
```

## Request Object

`ModelProcessRequest` fields:

- `input_audio_path: str` - input file path
- `work_dir: Path` - temporary working directory for model outputs
- `node_id: str` - workflow node ID for namespacing
- `options: dict[str, Any]` - user-defined options from node configuration

## Discovery and Registration

Model discovery is automatic:

- Built-in models: `core/src/deepnoise/models/*.py`
- External plugins: `models/*.py`

Registry file:

- `core/src/deepnoise/models/registry.py`

A class is auto-registered if:

- It subclasses `BaseAudioModel`
- It defines a non-empty `MODEL_NAME`

You can also register manually using `register_model(name, factory)`.

## Local Fallback Behavior

Workflow nodes support optional fallback if a requested model fails to load or execute.

Environment controls:

- `DEEPNOISE_ENABLE_MODEL_FALLBACK` (default `1`)
- `DEEPNOISE_FALLBACK_MODEL_NAME` (default `example_passthrough`)
- `DEEPNOISE_DEFAULT_DENOISE_MODEL` (default `deepfilternet`)
- `DEEPNOISE_DEFAULT_SEPARATION_MODEL` (default `sepformer`)

This allows local development to continue even when heavy models or downloads are unavailable.

## Adding a New Model

1. Create `models/my_custom_model.py`
2. Implement `BaseAudioModel`
3. Set `MODEL_NAME`
4. Start API and confirm availability:

```bash
curl http://127.0.0.1:8000/api/models
```

If your model appears in the response, it is ready for use in workflow nodes.
