# External Model Plugins

Drop custom model plugins in this directory to make them discoverable by DeepNoise.

## Requirements

- Each file must be a Python module (`*.py`).
- Each plugin class must inherit from `deepnoise.models.base_model.BaseAudioModel`.
- Each plugin class must define a non-empty `MODEL_NAME`.

## Example

```python
from deepnoise.models.base_model import BaseAudioModel, ModelProcessRequest


class MyCustomModel(BaseAudioModel):
    MODEL_NAME = "my_custom_model"

    def process(self, request: ModelProcessRequest) -> dict[str, str]:
        output_path = request.work_dir / f"custom_{request.node_id}.wav"
        # ... write audio file to output_path ...
        return {"audio": str(output_path)}
```

## Notes

- Built-in plugins still live under `core/src/deepnoise/models/`.
- External plugin scan path can be overridden with:

```bash
export DEEPNOISE_EXTERNAL_MODELS_DIR=/absolute/path/to/models
```
