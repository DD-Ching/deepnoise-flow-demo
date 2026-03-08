from __future__ import annotations

from pathlib import Path

import numpy as np
import soundfile as sf

from .common import resample_audio


def load_audio(path: str, target_sr: int | None = None) -> tuple[np.ndarray, int]:
    data, sr = sf.read(path, always_2d=False)
    if data.ndim > 1:
        data = data.mean(axis=1)
    data = data.astype("float32")
    if target_sr and sr != target_sr:
        data = resample_audio(data, sr, target_sr)
        sr = target_sr
    return data, sr


def mix_audio(paths: list[str], output_path: Path, weights: list[float] | None = None) -> str | None:
    if not paths:
        return None
    audios = []
    mix_weights = []
    sr = None
    for idx, path in enumerate(paths):
        data, sr_local = sf.read(path, always_2d=False)
        if data.ndim > 1:
            data = data.mean(axis=1)
        audios.append(data.astype("float32"))
        weight = 1.0
        if weights and idx < len(weights):
            try:
                weight = float(weights[idx])
            except (TypeError, ValueError):
                weight = 1.0
        mix_weights.append(weight)
        sr = sr or sr_local
    max_len = max(len(a) for a in audios)
    padded = []
    for a in audios:
        if len(a) < max_len:
            pad_width = max_len - len(a)
            a = np.pad(a, (0, pad_width))
        padded.append(a)
    total_weight = sum(mix_weights) if mix_weights else 1.0
    if total_weight == 0:
        total_weight = 1.0
    mix = sum(a * w for a, w in zip(padded, mix_weights)) / total_weight
    sf.write(output_path, mix, sr or 48000, subtype="PCM_16")
    return str(output_path)


def compute_residual(noisy_path: str, clean_path: str, output_path: Path) -> str | None:
    noisy_audio, noisy_sr = load_audio(noisy_path)
    clean_audio, _ = load_audio(clean_path, target_sr=noisy_sr)
    min_len = min(len(noisy_audio), len(clean_audio))
    if min_len <= 0:
        return None
    residual = noisy_audio[:min_len] - clean_audio[:min_len]
    residual = np.clip(residual, -1.0, 1.0)
    sf.write(output_path, residual, noisy_sr, subtype="PCM_16")
    return str(output_path)
