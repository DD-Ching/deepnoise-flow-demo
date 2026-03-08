from __future__ import annotations

import importlib
import importlib.util
import inspect
import os
from pathlib import Path
from types import ModuleType
from typing import Callable

from .base_model import BaseAudioModel

ModelFactory = Callable[[], BaseAudioModel] | type[BaseAudioModel]

_MODEL_FACTORIES: dict[str, ModelFactory] = {}
_DISCOVERED = False
_DISCOVERY_ERRORS: dict[str, str] = {}


def register_model(name: str, factory: ModelFactory) -> None:
    key = (name or "").strip().lower()
    if not key:
        raise ValueError("Model name cannot be empty.")
    _MODEL_FACTORIES[key] = factory


def _auto_register_classes(module: ModuleType) -> None:
    for _, candidate in inspect.getmembers(module, inspect.isclass):
        if not issubclass(candidate, BaseAudioModel) or candidate is BaseAudioModel:
            continue
        model_name = getattr(candidate, "MODEL_NAME", None)
        if not isinstance(model_name, str) or not model_name.strip():
            continue
        key = model_name.strip().lower()
        if key not in _MODEL_FACTORIES:
            register_model(key, candidate)


def _project_root_from_registry() -> Path:
    # core/src/deepnoise/models/registry.py -> project root at parents[4]
    return Path(__file__).resolve().parents[4]


def _discover_external_model_plugins() -> None:
    configured_dir = os.getenv("DEEPNOISE_EXTERNAL_MODELS_DIR")
    external_dir = (
        Path(configured_dir).expanduser().resolve()
        if configured_dir
        else (_project_root_from_registry() / "models").resolve()
    )
    if not external_dir.exists() or not external_dir.is_dir():
        return

    for file in sorted(external_dir.glob("*.py")):
        if file.stem.startswith("_"):
            continue
        module_name = f"deepnoise_external_models.{file.stem}"
        try:
            spec = importlib.util.spec_from_file_location(module_name, file)
            if spec is None or spec.loader is None:
                raise ImportError(f"Unable to build import spec for {file}")
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
        except Exception as exc:  # noqa: BLE001
            _DISCOVERY_ERRORS[str(file)] = str(exc)
            continue
        _auto_register_classes(module)


def discover_model_plugins(force: bool = False) -> None:
    global _DISCOVERED
    if _DISCOVERED and not force:
        return
    _DISCOVERED = True
    _DISCOVERY_ERRORS.clear()

    package_dir = Path(__file__).resolve().parent
    for file in sorted(package_dir.glob("*.py")):
        if file.stem in {"__init__", "base_model", "registry"}:
            continue
        module_name = f"{__package__}.{file.stem}"
        try:
            module = importlib.import_module(module_name)
        except Exception as exc:  # noqa: BLE001
            _DISCOVERY_ERRORS[module_name] = str(exc)
            continue
        _auto_register_classes(module)

    _discover_external_model_plugins()


def list_registered_models() -> list[str]:
    discover_model_plugins()
    return sorted(_MODEL_FACTORIES.keys())


def create_model(name: str) -> BaseAudioModel:
    key = (name or "").strip().lower()
    discover_model_plugins()
    factory = _MODEL_FACTORIES.get(key)
    if factory is None:
        available = ", ".join(list_registered_models()) or "<none>"
        discovery_hint = ""
        if _DISCOVERY_ERRORS:
            discovery_hint = f" Discovery errors: {_DISCOVERY_ERRORS}"
        raise ValueError(
            f"Model '{name}' is not registered. Available models: {available}.{discovery_hint}"
        )
    model = factory() if not inspect.isclass(factory) else factory()
    model.load()
    return model
