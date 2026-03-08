from __future__ import annotations

import logging
import shutil
from collections import deque
from pathlib import Path
from time import perf_counter
from typing import Any

from .context import PipelineExecutionContext
from .node_modules import get_node_module

LOGGER = logging.getLogger(__name__)


def _topological_sort(nodes: list[dict[str, Any]], edges: list[dict[str, Any]]) -> list[str]:
    node_ids = [node["id"] for node in nodes]
    indegree = {node_id: 0 for node_id in node_ids}
    adjacency: dict[str, list[str]] = {node_id: [] for node_id in node_ids}

    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")
        if source in adjacency and target in adjacency:
            adjacency[source].append(target)
            indegree[target] += 1

    queue = deque(node_id for node_id, degree in indegree.items() if degree == 0)
    ordered: list[str] = []
    while queue:
        node_id = queue.popleft()
        ordered.append(node_id)
        for next_node in adjacency[node_id]:
            indegree[next_node] -= 1
            if indegree[next_node] == 0:
                queue.append(next_node)

    if len(ordered) != len(node_ids):
        raise ValueError("Workflow graph contains a cycle.")
    return ordered


def _copy_output_to_run_dir(source_path: Path, run_dir: Path, target_name: str | None = None) -> Path:
    target = run_dir / (target_name or source_path.name)
    if source_path.resolve() != target.resolve():
        shutil.copy(source_path, target)
    return target


class WorkflowRunner:
    def __init__(
        self,
        *,
        nodes: list[dict[str, Any]],
        edges: list[dict[str, Any]],
        prepared_path: Path,
        tmpdir_path: Path,
        run_dir: Path,
        target_node_id: str | None = None,
    ) -> None:
        self.context = PipelineExecutionContext(
            nodes=nodes,
            edges=edges,
            prepared_path=prepared_path,
            tmpdir_path=tmpdir_path,
            run_dir=run_dir,
            target_node_id=target_node_id,
        )

    def run(self) -> tuple[dict[str, str], dict[str, dict[str, str]]]:
        ordered_node_ids = _topological_sort(self.context.nodes, self.context.edges)
        if self.context.target_node_id and self.context.target_node_id in ordered_node_ids:
            ordered_node_ids = ordered_node_ids[
                : ordered_node_ids.index(self.context.target_node_id) + 1
            ]

        try:
            for node_id in ordered_node_ids:
                node = self.context.node_map.get(node_id)
                if not node:
                    continue

                node_type = node.get("type")
                module = get_node_module(node_type)
                if module is None:
                    raise ValueError(f"Unsupported workflow node type: '{node_type}'.")

                inputs = self.context.resolve_inputs(node_id)
                if node_type != "input" and not inputs:
                    continue

                data = node.get("data", {})
                if node_type != "input" and data.get("enabled") is False:
                    self.context.node_outputs[node_id] = {"audio": inputs[0]}
                    continue

                node_start = perf_counter()
                output = module.execute(context=self.context, node=node, inputs=inputs)
                node_elapsed_ms = round((perf_counter() - node_start) * 1000, 2)
                LOGGER.info(
                    "[perf] node execution time %sms node_id=%s type=%s",
                    node_elapsed_ms,
                    node_id,
                    node_type,
                )
                if output:
                    self.context.node_outputs[node_id] = output
        finally:
            self.context.release_models()

        return self._build_response_payloads(ordered_node_ids)

    def _build_response_payloads(
        self, ordered_node_ids: list[str]
    ) -> tuple[dict[str, str], dict[str, dict[str, str]]]:
        outputs_payload: dict[str, str] = {}
        node_outputs_payload: dict[str, dict[str, str]] = {}
        copied_targets: dict[tuple[str, str], Path] = {}

        def materialize(source: str, target_name: str | None = None) -> Path | None:
            source_path = Path(source)
            if not source_path.exists():
                return None
            resolved_key = (
                str(source_path.resolve()),
                target_name or "",
            )
            if resolved_key in copied_targets:
                return copied_targets[resolved_key]
            target = _copy_output_to_run_dir(source_path, self.context.run_dir, target_name)
            copied_targets[resolved_key] = target
            return target

        final_audio = None
        if ordered_node_ids:
            last_outputs = self.context.node_outputs.get(ordered_node_ids[-1], {})
            final_audio = last_outputs.get("audio")

        denoise_audio = None
        for node_id in ordered_node_ids:
            node = self.context.node_map.get(node_id)
            if node and node.get("type") == "denoise":
                denoise_audio = self.context.node_outputs.get(node_id, {}).get("audio")
                if denoise_audio:
                    break

        clean_source = denoise_audio or final_audio
        if clean_source:
            target = materialize(clean_source)
            if target:
                outputs_payload["clean"] = f"/api/output/{self.context.run_dir.name}/{target.name}"

        # Keep top-level outputs for convenience.
        for output in self.context.node_outputs.values():
            for key, source in output.items():
                if key == "audio" or not source:
                    continue
                target = materialize(source)
                if not target:
                    continue
                outputs_payload[key] = f"/api/output/{self.context.run_dir.name}/{target.name}"

        # Provide per-node outputs for inspector and floating panels.
        for node_id, output in self.context.node_outputs.items():
            node_payload: dict[str, str] = {}
            for key, source in output.items():
                if not source:
                    continue
                source_path = Path(source)
                target_name = f"{key}_{node_id}{source_path.suffix}"
                target = materialize(source, target_name)
                if not target:
                    continue
                node_payload[key] = f"/api/output/{self.context.run_dir.name}/{target.name}"
            if node_payload:
                node_outputs_payload[node_id] = node_payload

        return outputs_payload, node_outputs_payload
