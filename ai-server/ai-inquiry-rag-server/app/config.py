from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Inquiry RAG Server"
    database_url: str
    openai_api_key: str
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


settings = Settings()
