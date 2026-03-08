# Model Extension Guide

DeepNoise uses a plugin-style model architecture so models can be swapped as tooling evolves.

## Why this architecture

Audio model quality and APIs change quickly. The workflow engine should not be rewritten whenever a model changes.

## Core files

- Interface: `core/src/deepnoise/models/base_model.py`
- Registry: `core/src/deepnoise/models/registry.py`
- Node modules: `core/src/deepnoise/workflow/node_modules.py`
- Runner: `core/src/deepnoise/workflow/runner.py`

## Base model interface

All plugins should implement:

- `load()`
- `process(request)`
- `release()`

`process` receives `ModelProcessRequest` and returns named output paths, for example:

```python
{"audio": "/tmp/output.wav"}
```

## Plugin locations

Two plugin locations are supported:

1. Built-in plugins: `core/src/deepnoise/models/*.py`
2. External plugins: `models/*.py`

External plugin directory can be overridden:

```bash
export DEEPNOISE_EXTERNAL_MODELS_DIR=/absolute/path/to/models
```

## Add a new model plugin

Create `models/my_custom_model.py`:

```python
from deepnoise.models.base_model import BaseAudioModel, ModelProcessRequest


class MyCustomModel(BaseAudioModel):
    MODEL_NAME = "my_custom_model"

    def process(self, request: ModelProcessRequest) -> dict[str, str]:
        output_path = request.work_dir / f"custom_{request.node_id}.wav"
        # ... write output file ...
        return {"audio": str(output_path)}
```

Then restart the backend and verify:

```bash
curl http://127.0.0.1:8000/api/models
```

## How the pipeline calls models

For `denoise`, `separation`, and `custom_model` nodes:

1. Read `data.model` or `data.model_name`.
2. Resolve model from registry.
3. Execute `model.process(request)`.
4. Collect outputs and expose via `/api/output/...`.

## Node mapping

- `input` -> `InputNodeModule`
- `denoise` -> `DenoiseNodeModule`
- `separation` -> `SeparationNodeModule`
- `custom_model` -> `CustomModelNodeModule`
- `mixer` -> `MixerNodeModule`
- `export` -> `ExportNodeModule`

## Latency notes

- Model instances are cached per pipeline execution.
- Input preprocessing runs once per request.
- Pipeline passes file paths to avoid redundant in-memory copies.
- Output materialization caches copied artifacts per response build.

## CLI examples

```bash
python core/main.py --input sample.wav --mode denoise_only --denoise-model deepfilternet --output clean.wav
```

```bash
python core/main.py --input sample.wav --mode denoise_and_separate --denoise-model deepfilternet --separation-model sepformer --output_dir output
```
