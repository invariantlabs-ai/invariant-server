from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    production: bool = False
    idle_timeout: int = 10 * 60  # 10 minutes of inactivity before stopping the process


settings = Settings()
