from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    return database_url


class Settings(BaseSettings):
    app_name: str = "AI Inquiry RAG Server"
    database_url: str
    openai_api_key: str | None = None
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4.1-mini"
    rag_collection_name: str = "ai_inquiry_documents"
    github_token: str | None = None
    github_repository: str = "binny0x00/ai-sw-fullstack-note"
    github_project_owner: str | None = None
    github_project_title: str = "ai-inquiry"
    github_project_status_field: str = "Status"
    github_project_status_option: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    def model_post_init(self, __context: object) -> None:
        self.database_url = normalize_database_url(self.database_url)

    def require_openai_api_key(self) -> str:
        if not self.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required for AI features.")

        return self.openai_api_key


settings = Settings()
