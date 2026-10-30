from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    node_env: str = "development"
    port: int = 5000
    mongodb_uri: str = "mongodb://127.0.0.1:27017/cedo_mern"
    cors_origin: str = "http://localhost:5173"

    @property
    def is_test(self) -> bool:
        return self.node_env == "test"

    @property
    def is_production(self) -> bool:
        return self.node_env == "production"

    def cors_origins(self):
        if self.cors_origin == "*":
            return ["*"]
        origins = [o.strip() for o in self.cors_origin.split(",")]
        return [o for o in origins if o]


settings = Settings()
