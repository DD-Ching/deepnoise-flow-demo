from __future__ import annotations

from .base_model import BaseAudioModel, ModelProcessRequest


class DeepFilterNetModel(BaseAudioModel):
    MODEL_NAME = "deepfilternet"

    def process(self, request: ModelProcessRequest) -> dict[str, str]:
        output_path = request.work_dir / f"denoise_{request.node_id}.wav"
        attenuation_db = request.options.get("attenuation_db")
        model_base_dir = request.options.get("model_base_dir")
        input_is_prepared = bool(request.options.get("input_is_prepared", True))
        # Lazy import avoids loading model dependencies for unused plugins.
        from ..offline import denoise_file

        denoise_file(
            input_path=request.input_audio_path,
            output_path=str(output_path),
            model_base_dir=model_base_dir,
            attenuation_db=attenuation_db,
            input_is_prepared=input_is_prepared,
        )

        return {"audio": str(output_path)}
