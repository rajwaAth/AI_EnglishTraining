from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OR_API_KEY: str
    OR_MODEL_NAME: str

    class Config:
        env_file = ".env"

settings = Settings()
