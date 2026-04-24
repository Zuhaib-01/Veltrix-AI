from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    MODEL_PATH: str = "./ml_models/model.pkl"
    VECTORIZER_PATH: str = "./ml_models/vectorizer.pkl"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENV: str = "development"
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
