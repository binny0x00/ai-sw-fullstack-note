from langchain_core.documents import Document
from sqlalchemy.orm import Session

from app.rag.vector_store import PgVectorStore


class RagService:
    def __init__(self, db: Session) -> None:
        self.vector_store = PgVectorStore()

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        documents = self.retrieve(query, top_k)
        return [_document_to_search_result(document) for document in documents]

    def retrieve(self, query: str, top_k: int = 5) -> list[Document]:
        return self.vector_store.search_documents(query, top_k)

    def build_context(self, results: list[dict]) -> str:
        context_parts: list[str] = []

        for index, result in enumerate(results, start=1):
            context_parts.append(
                f"[문서 {index}: {result['source']}]\n{result['content']}"
            )

        return "\n\n".join(context_parts)

    def build_context_from_documents(self, documents: list[Document]) -> str:
        results = [_document_to_search_result(document) for document in documents]
        return self.build_context(results)


def _document_to_search_result(document: Document) -> dict:
    return {
        "content": document.page_content,
        "source": document.metadata["source"],
        "title": document.metadata["title"],
        "category": document.metadata["category"],
        "distance": document.metadata.get("distance", 0.0),
    }
