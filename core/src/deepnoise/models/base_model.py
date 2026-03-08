from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class ModelProcessRequest:
    """
    Standard request object passed to all model plugins.

    This keeps the model API stable while still allowing new options to be added.
    """

    input_audio_path: str
    work_dir: Path
    node_id: str
    options: dict[str, Any] = field(default_factory=dict)


class BaseAudioModel(ABC):
    """
    Base interface for all backend audio model plugins.

    Required lifecycle:
      1) load()
      2) process(request)
      3) release()
    """

    MODEL_NAME = "base"

    def load(self) -> None:
        """Allocate model resources. Called once per pipeline execution when first used."""
        return None

    @abstractmethod
    def process(self, request: ModelProcessRequest) -> dict[str, str]:
        """
        Run inference.

        Must return a mapping of named audio outputs. `audio` should be provided when possible.
        """

    def release(self) -> None:
        """Release resources when pipeline execution finishes."""
        return None
