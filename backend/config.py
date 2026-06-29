from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "LocalApex"
    app_env: str = "production"
    app_secret_key: str
    app_debug: bool = False
    database_url: str
    allowed_origins: str = "*"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    openai_api_key: str = ""
    gemini_api_key: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "LocalApex"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
