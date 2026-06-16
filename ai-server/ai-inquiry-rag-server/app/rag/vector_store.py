from langchain_core.documents import Document
from langchain_postgres import PGVector

from app.config import settings
from app.rag.embeddings import EmbeddingService


class PgVectorStore:
    def __init__(self) -> None:
        self.embeddings = EmbeddingService().embeddings
        self.vector_store = PGVector(
            embeddings=self.embeddings,
            connection=settings.database_url,
            collection_name=settings.rag_collection_name,
            embedding_length=1536,
            use_jsonb=True,
        )

    def replace_documents(self, documents: list[Document], ids: list[str]) -> None:
        PGVector.from_documents(
            documents=documents,
            embedding=self.embeddings,
            ids=ids,
            connection=settings.database_url,
            collection_name=settings.rag_collection_name,
            pre_delete_collection=True,
            use_jsonb=True,
        )

    def search_documents(
        self,
        query: str,
        top_k: int = 5,
    ) -> list[Document]:
        results = self.vector_store.similarity_search_with_score(
            query=query,
            k=top_k,
        )

        documents: list[Document] = []
        for document, distance in results:
            document.metadata["distance"] = distance
            documents.append(document)

        return documents
