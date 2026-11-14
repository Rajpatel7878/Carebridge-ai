from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "CareBridge AI"
    environment: str = "development"
    database_url: str = "sqlite:///./carebridge.db"
    jwt_secret: str = "change-this-in-development"
    gemini_api_key: str | None = None
    max_upload_size_mb: int = 10
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
