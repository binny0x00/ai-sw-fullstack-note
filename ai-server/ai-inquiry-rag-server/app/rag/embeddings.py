from langchain_openai import OpenAIEmbeddings

from app.config import settings


class EmbeddingService:
    def __init__(self) -> None:
        self.embeddings = OpenAIEmbeddings(
            api_key=settings.require_openai_api_key(),
            model=settings.openai_embedding_model,
        )

    def create_one(self, text: str) -> list[float]:
        return self.embeddings.embed_query(text)

    def create_many(self, texts: list[str]) -> list[list[float]]:
        return self.embeddings.embed_documents(texts)
