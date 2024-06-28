from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    production: bool = False

settings = Settings()