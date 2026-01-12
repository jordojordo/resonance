from functools import lru_cache
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel
from pydantic_settings import BaseSettings


class AuthSettings(BaseModel):
    enabled: bool = False
    type: Literal["basic", "api_key", "proxy"] | None = None
    username: str | None = None
    password: str | None = None
    api_key: str | None = None


class UISettings(BaseModel):
    auth: AuthSettings = AuthSettings()


class Settings(BaseSettings):
    debug: bool = False
    config_path: Path = Path("/config/config.yaml")
    data_path: Path = Path("/data")
    ui: UISettings = UISettings()

    @classmethod
    def from_yaml(cls, config_path: Path) -> "Settings":
        """Load settings from YAML config file."""
        if not config_path.exists():
            return cls()

        with open(config_path) as f:
            config_data = yaml.safe_load(f) or {}

        # Extract UI settings
        ui_data = config_data.get("ui", {})
        auth_data = ui_data.get("auth", {})

        return cls(
            debug=config_data.get("debug", False),
            config_path=config_path,
            data_path=Path(config_data.get("data_path", "/data")),
            ui=UISettings(auth=AuthSettings(**auth_data)),
        )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    config_path = Path("/config/config.yaml")
    return Settings.from_yaml(config_path)
