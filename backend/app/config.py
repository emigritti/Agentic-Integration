from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    use_stub_services: bool = True
    log_level: str = "INFO"
    max_executions_stored: int = 100
    cooldown_seconds: int = 300
    idempotency_ttl_seconds: int = 86400


@lru_cache
def get_settings() -> Settings:
    return Settings()
