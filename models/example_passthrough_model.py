from __future__ import annotations

import shutil

from deepnoise.models.base_model import BaseAudioModel, ModelProcessRequest


class ExamplePassthroughModel(BaseAudioModel):
    """Simple example model plugin for development/testing."""

    MODEL_NAME = "example_passthrough"

    def process(self, request: ModelProcessRequest) -> dict[str, str]:
        output_path = request.work_dir / f"passthrough_{request.node_id}.wav"
        shutil.copy(request.input_audio_path, output_path)
        return {"audio": str(output_path)}
