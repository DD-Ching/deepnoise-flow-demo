from __future__ import annotations

from pathlib import Path
from typing import Any

from .workflow import WorkflowRunner


def run_workflow(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    prepared_path: Path,
    tmpdir_path: Path,
    run_dir: Path,
    target_node_id: str | None = None,
) -> tuple[dict[str, str], dict[str, dict[str, str]]]:
    """
    Backward-compatible facade used by the API layer.

    Internally delegates to the modular workflow runner so models and node behaviors
    can be swapped without rewriting the API route.
    """

    runner = WorkflowRunner(
        nodes=nodes,
        edges=edges,
        prepared_path=prepared_path,
        tmpdir_path=tmpdir_path,
        run_dir=run_dir,
        target_node_id=target_node_id,
    )
    return runner.run()
