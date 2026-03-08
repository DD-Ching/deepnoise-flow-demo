from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

import torch
import torchaudio
from speechbrain.inference.separation import SepformerSeparation

MODEL_ID = "speechbrain/sepformer-wsj02mix"
TARGET_SR = 8000


def _ensure_mono(waveform: torch.Tensor) -> torch.Tensor:
    if waveform.dim() == 1:
        return waveform.unsqueeze(0)
    if waveform.shape[0] == 1:
        return waveform
    return waveform.mean(dim=0, keepdim=True)


@lru_cache(maxsize=1)
def _get_model() -> SepformerSeparation:
    device = "cuda" if torch.cuda.is_available() else "cpu"
    cache_dir = Path.home() / ".cache" / "deepnoise" / "sepformer-wsj02mix"
    return SepformerSeparation.from_hparams(
        source=MODEL_ID,
        savedir=str(cache_dir),
        run_opts={"device": device},
    )


def separate_speakers(audio_path: str, output_dir: str) -> List[str]:
    """
    Separate speakers from an audio file using SepFormer.

    Returns a list of output WAV file paths.
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = _get_model()

    waveform, sr = torchaudio.load(audio_path)
    waveform = _ensure_mono(waveform)

    if sr != TARGET_SR:
        waveform = torchaudio.functional.resample(waveform, sr, TARGET_SR)

    waveform = waveform.to(device)

    with torch.no_grad():
        est_sources = model.separate_batch(waveform)

    # est_sources shape: [batch, time, num_speakers]
    est_sources = est_sources[0].cpu()

    output_files: List[str] = []
    num_speakers = est_sources.shape[-1]
    for idx in range(num_speakers):
        speaker_audio = est_sources[:, idx].unsqueeze(0)
        out_file = output_path / f"speaker_{idx + 1}.wav"
        torchaudio.save(str(out_file), speaker_audio, TARGET_SR)
        output_files.append(str(out_file))

    return output_files
