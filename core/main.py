from __future__ import annotations

import argparse
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from deepnoise.common import prepare_audio_for_model
from deepnoise.models import create_model, list_registered_models
from deepnoise.models.base_model import ModelProcessRequest


MODES = ("denoise_only", "denoise_and_separate")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="DeepNoise modular pipeline runner",
        epilog="This CLI uses model plugins from core/src/deepnoise/models and ./models.",
    )
    parser.add_argument("--input", required=True, help="Input audio path")
    parser.add_argument(
        "--output",
        default="clean.wav",
        help="Output path for denoise_only (default: clean.wav)",
    )
    parser.add_argument(
        "--output_dir",
        default="output",
        help="Output directory for denoise_and_separate (default: output)",
    )
    parser.add_argument(
        "--mode",
        choices=MODES,
        default="denoise_only",
        help="Pipeline mode",
    )
    parser.add_argument(
        "--model-base-dir",
        default=None,
        help="Optional local DeepFilterNet model directory",
    )
    parser.add_argument(
        "--denoise-model",
        default="deepfilternet",
        help="Model name for denoising stage (default: deepfilternet)",
    )
    parser.add_argument(
        "--separation-model",
        default="sepformer",
        help="Model name for separation stage (default: sepformer)",
    )
    return parser


def _run_model(
    *,
    model_name: str,
    input_audio_path: str,
    work_dir: Path,
    node_id: str,
    options: dict | None = None,
) -> dict[str, str]:
    model = create_model(model_name)
    try:
        request = ModelProcessRequest(
            input_audio_path=input_audio_path,
            work_dir=work_dir,
            node_id=node_id,
            options=options or {},
        )
        return model.process(request)
    finally:
        model.release()


def run_pipeline(
    *,
    input_path: str,
    output_path: str,
    output_dir: str,
    mode: str,
    model_base_dir: str | None,
    denoise_model: str,
    separation_model: str,
) -> None:
    input_file = Path(input_path).resolve()
    if not input_file.exists():
        raise FileNotFoundError(f"Input file does not exist: {input_file}")

    available = list_registered_models()
    print(f"Available models: {', '.join(available) if available else '<none>'}")

    with tempfile.TemporaryDirectory(prefix="deepnoise_cli_") as tmpdir:
        tmpdir_path = Path(tmpdir)
        with prepare_audio_for_model(str(input_file)) as prepared:
            prepared_path = prepared.path
            print(f"Running denoise model: {denoise_model}")
            denoise_result = _run_model(
                model_name=denoise_model,
                input_audio_path=prepared_path,
                work_dir=tmpdir_path,
                node_id="cli_denoise",
                options={
                    "model_base_dir": model_base_dir,
                    "input_is_prepared": True,
                },
            )
            clean_audio = denoise_result.get("audio")
            if not clean_audio:
                raise RuntimeError(f"Model '{denoise_model}' did not return 'audio' output.")

            if mode == "denoise_only":
                target = Path(output_path).resolve()
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(clean_audio, target)
                print(f"Denoise complete: {target}")
                return

            output_root = Path(output_dir).resolve()
            output_root.mkdir(parents=True, exist_ok=True)
            clean_target = output_root / "clean.wav"
            shutil.copy(clean_audio, clean_target)

            print(f"Running separation model: {separation_model}")
            separation_result = _run_model(
                model_name=separation_model,
                input_audio_path=clean_audio,
                work_dir=tmpdir_path,
                node_id="cli_separation",
                options={"output_subdir": "cli_sep"},
            )

            print(f"Separation complete: {output_root}")
            for name, source in sorted(separation_result.items()):
                source_path = Path(source)
                if not source_path.exists():
                    continue
                target = output_root / f"{name}{source_path.suffix}"
                shutil.copy(source_path, target)
                print(target)


def main() -> None:
    args = build_parser().parse_args()
    run_pipeline(
        input_path=args.input,
        output_path=args.output,
        output_dir=args.output_dir,
        mode=args.mode,
        model_base_dir=args.model_base_dir,
        denoise_model=args.denoise_model,
        separation_model=args.separation_model,
    )


if __name__ == "__main__":
    main()
