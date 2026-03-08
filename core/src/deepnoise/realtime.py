from __future__ import annotations

import argparse
import queue
import sys

import numpy as np
import sounddevice as sd
import torch
from df.enhance import enhance, init_df

from .common import TARGET_SR, save_wav_16bit


def run_realtime(
    output_path: str,
    seconds: int = 10,
    blocksize: int = 960,
    model_base_dir: str | None = None,
    device: int | None = None,
) -> None:
    """
    Real-time noise suppression:
    - Capture mono mic audio at 48kHz
    - Enhance frame-by-frame with persistent DF state
    - Play denoised output and optionally save to WAV
    """
    model, df_state, _ = init_df(model_base_dir=model_base_dir, post_filter=True)

    total_frames = seconds * TARGET_SR
    captured = []

    in_q: queue.Queue[np.ndarray] = queue.Queue(maxsize=32)
    out_q: queue.Queue[np.ndarray] = queue.Queue(maxsize=32)

    def audio_callback(indata, outdata, frames, time, status):  # type: ignore[no-untyped-def]
        if status:
            print(f"[audio status] {status}", file=sys.stderr)

        mono = indata[:, 0].copy()
        try:
            in_q.put_nowait(mono)
        except queue.Full:
            pass

        try:
            enhanced_block = out_q.get_nowait()
        except queue.Empty:
            enhanced_block = np.zeros(frames, dtype=np.float32)

        outdata[:, 0] = enhanced_block

    processed = 0
    with sd.Stream(
        samplerate=TARGET_SR,
        channels=1,
        dtype="float32",
        callback=audio_callback,
        blocksize=blocksize,
        device=device,
    ):
        print("開始即時降噪（Ctrl+C 可提前停止）...")
        while processed < total_frames:
            block = in_q.get()
            block_tensor = torch.from_numpy(block).unsqueeze(0)
            enhanced = enhance(model, df_state, block_tensor).squeeze(0).cpu().numpy()
            enhanced = np.clip(enhanced, -1.0, 1.0).astype(np.float32)

            captured.append(enhanced)
            processed += len(enhanced)

            try:
                out_q.put_nowait(enhanced)
            except queue.Full:
                pass

    final_audio = np.concatenate(captured) if captured else np.zeros(1, dtype=np.float32)
    save_wav_16bit(output_path, final_audio[:total_frames], TARGET_SR)
    print(f"已輸出: {output_path}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Real-time mic denoising using DeepFilterNet")
    parser.add_argument("-o", "--output", required=True, help="Output WAV path")
    parser.add_argument("-t", "--seconds", type=int, default=10, help="Recording duration in seconds")
    parser.add_argument(
        "--blocksize",
        type=int,
        default=960,
        help="Audio blocksize in samples (default: 20ms @ 48kHz)",
    )
    parser.add_argument("--device", type=int, default=None, help="Optional sounddevice index")
    parser.add_argument(
        "--model-base-dir",
        default=None,
        help="Optional local DeepFilterNet model directory",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    run_realtime(
        output_path=args.output,
        seconds=args.seconds,
        blocksize=args.blocksize,
        model_base_dir=args.model_base_dir,
        device=args.device,
    )


if __name__ == "__main__":
    main()
