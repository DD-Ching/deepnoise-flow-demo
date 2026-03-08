from __future__ import annotations

from pathlib import Path

from .base_model import BaseAudioModel, ModelProcessRequest


class SepFormerModel(BaseAudioModel):
    MODEL_NAME = "sepformer"

    def process(self, request: ModelProcessRequest) -> dict[str, str]:
        # Lazy import keeps registry discovery lightweight when this model is unused.
        from separation.sepformer import separate_speakers

        output_subdir = request.options.get("output_subdir") or f"sep_{request.node_id}"
        output_dir = request.work_dir / str(output_subdir)
        output_dir.mkdir(parents=True, exist_ok=True)

        speakers = separate_speakers(request.input_audio_path, str(output_dir))
        payload: dict[str, str] = {}

        if len(speakers) > 0:
            payload["speaker_1"] = speakers[0]
        if len(speakers) > 1:
            payload["speaker_2"] = speakers[1]

        # Preserve additional speakers if the model returns more than two.
        for idx, speaker_path in enumerate(speakers[2:], start=3):
            payload[f"speaker_{idx}"] = str(Path(speaker_path))

        return payload
