from sqlalchemy.orm import Session

from app.rag.embeddings import EmbeddingService
from app.rag.vector_store import PgVectorStore


class RagService:
    def __init__(self, db: Session) -> None:
        self.embedding_service = EmbeddingService()
        self.vector_store = PgVectorStore(db)

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        query_embedding = self.embedding_service.create_one(query)
        return self.vector_store.search(query_embedding, top_k)

    def build_context(self, results: list[dict]) -> str:
        context_parts: list[str] = []

        for index, result in enumerate(results, start=1):
            context_parts.append(
                f"[문서 {index}: {result['source']}]\n{result['content']}"
            )

        return "\n\n".join(context_parts)

