from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from ..models import create_model, discover_model_plugins, list_registered_models
from ..models.base_model import BaseAudioModel


@dataclass(slots=True)
class PipelineExecutionContext:
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    prepared_path: Path
    tmpdir_path: Path
    run_dir: Path
    target_node_id: str | None = None
    node_outputs: dict[str, dict[str, str]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.node_map: dict[str, dict[str, Any]] = {node["id"]: node for node in self.nodes}
        self._model_instances: dict[str, BaseAudioModel] = {}
        discover_model_plugins()

    def resolve_inputs(self, target_node_id: str) -> list[str]:
        resolved: list[str] = []
        for edge in self.edges:
            if edge.get("target") != target_node_id:
                continue
            source_id = edge.get("source")
            source_handle = edge.get("sourceHandle")
            source_outputs = self.node_outputs.get(source_id, {})
            if source_handle and source_handle in source_outputs:
                resolved.append(source_outputs[source_handle])
                continue
            if "audio" in source_outputs:
                resolved.append(source_outputs["audio"])
        return resolved

    def resolve_mixer_inputs(self, target_node_id: str) -> list[tuple[str, str | None]]:
        resolved: list[tuple[str, str | None]] = []
        for edge in self.edges:
            if edge.get("target") != target_node_id:
                continue
            source_id = edge.get("source")
            source_handle = edge.get("sourceHandle")
            source_outputs = self.node_outputs.get(source_id, {})

            if source_handle and source_handle in source_outputs:
                audio_path = source_outputs[source_handle]
            elif "audio" in source_outputs:
                audio_path = source_outputs["audio"]
            else:
                continue

            resolved.append((audio_path, edge.get("targetHandle")))
        return resolved

    def get_model(self, model_name: str) -> BaseAudioModel:
        key = (model_name or "").strip().lower()
        if not key:
            available = ", ".join(list_registered_models()) or "<none>"
            raise ValueError(f"Model name is empty. Available models: {available}")
        if key not in self._model_instances:
            self._model_instances[key] = create_model(key)
        return self._model_instances[key]

    def release_models(self) -> None:
        for model in self._model_instances.values():
            model.release()
        self._model_instances.clear()
