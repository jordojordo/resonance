"""Configuration loader for Resonance discovery backend."""

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml


def _get_config_path() -> Path:
    """Get the configuration file path from environment or default."""
    return Path(os.environ.get("CONFIG_PATH", "/config/config.yaml"))


def _get_data_path_root() -> Path:
    """Get the data directory path from environment or default."""
    return Path(os.environ.get("DATA_PATH", "/data"))


def _apply_env_overrides(config: dict) -> dict:
    """
    Apply RESONANCE_* environment variable overrides to config.

    Environment variables use double underscore for nesting:
    - RESONANCE_SLSKD__HOST -> config["slskd"]["host"]
    - RESONANCE_LISTENBRAINZ__USERNAME -> config["listenbrainz"]["username"]
    """
    prefix = "RESONANCE_"

    for key, value in os.environ.items():
        if not key.startswith(prefix):
            continue

        # Remove prefix and split by double underscore
        config_key = key[len(prefix):]
        parts = config_key.lower().split("__")

        # Navigate/create nested dict structure
        current = config
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            elif not isinstance(current[part], dict):
                # Can't override a non-dict value with nested keys
                break
            current = current[part]
        else:
            # Set the final value, attempting type conversion
            final_key = parts[-1]
            current[final_key] = _convert_value(value)

    return config


def _convert_value(value: str) -> Any:
    """Convert string environment variable to appropriate type."""
    # Boolean conversion
    if value.lower() in ("true", "yes", "1"):
        return True
    if value.lower() in ("false", "no", "0"):
        return False

    # Integer conversion
    try:
        return int(value)
    except ValueError:
        pass

    # Float conversion
    try:
        return float(value)
    except ValueError:
        pass

    # Return as string
    return value


@lru_cache()
def load_config() -> dict:
    """
    Load configuration from YAML file with environment variable overrides.

    Configuration is loaded from CONFIG_PATH environment variable
    (default: /config/config.yaml).

    Environment variables prefixed with RESONANCE_ can override config values.
    Use double underscore for nested keys:
    - RESONANCE_SLSKD__HOST overrides config["slskd"]["host"]

    Returns:
        Configuration dictionary
    """
    config_path = _get_config_path()

    if not config_path.exists():
        # Return empty config if file doesn't exist
        # Environment overrides can still populate it
        config = {}
    else:
        with open(config_path) as f:
            config = yaml.safe_load(f) or {}

    return _apply_env_overrides(config)


def get_data_path(filename: str) -> Path:
    """
    Get the full path for a data file.

    Args:
        filename: Name of the file within the data directory

    Returns:
        Full Path object for the file
    """
    return _get_data_path_root() / filename
