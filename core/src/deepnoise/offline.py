from __future__ import annotations

import argparse
from functools import lru_cache

import torch
from df.enhance import enhance, init_df

from .common import load_wav, prepare_audio_for_model, save_wav_16bit


@lru_cache(maxsize=1)
def _get_df_state(model_base_dir: str | None) -> tuple[torch.nn.Module, object, object]:
    return init_df(model_base_dir=model_base_dir, post_filter=True)


def denoise_file(
    input_path: str,
    output_path: str,
    model_base_dir: str | None = None,
    attenuation_db: float | None = None,
    input_is_prepared: bool = False,
) -> None:
    model, df_state, _ = _get_df_state(model_base_dir)
    if input_is_prepared:
        noisy, sr = load_wav(input_path)
    else:
        with prepare_audio_for_model(input_path) as prepared:
            noisy, sr = load_wav(prepared.path)

    noisy_tensor = torch.from_numpy(noisy).unsqueeze(0)
    enhanced = (
        enhance(model, df_state, noisy_tensor, atten_lim_db=attenuation_db)
        .squeeze(0)
        .cpu()
        .numpy()
    )

    save_wav_16bit(output_path, enhanced, sr)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Offline speech denoising using DeepFilterNet")
    parser.add_argument("-i", "--input", required=True, help="Input audio path")
    parser.add_argument("-o", "--output", required=True, help="Output WAV path (16-bit/48kHz)")
    parser.add_argument(
        "--model-base-dir",
        default=None,
        help="Optional local DeepFilterNet model directory",
    )
    parser.add_argument(
        "--attenuation-db",
        type=float,
        default=None,
        help="Optional attenuation limit in dB (DeepFilterNet atten_lim_db).",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    denoise_file(args.input, args.output, args.model_base_dir, args.attenuation_db)


if __name__ == "__main__":
    main()
