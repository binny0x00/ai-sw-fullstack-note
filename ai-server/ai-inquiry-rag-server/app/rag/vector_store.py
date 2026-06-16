from langchain_core.documents import Document
from langchain_postgres import PGVector
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.rag.embeddings import EmbeddingService


class PgVectorStore:
    def __init__(self, db: Session | None = None) -> None:
        self.db = db
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

    def upsert_documents(self, documents: list[Document], ids: list[str]) -> None:
        self.vector_store.add_documents(documents=documents, ids=ids)

    def delete_by_source(self, source: str) -> None:
        if self.db is None:
            return

        if not self._has_vector_tables():
            return

        self.db.execute(
            text(
                """
                DELETE FROM langchain_pg_embedding e
                USING langchain_pg_collection c
                WHERE e.collection_id = c.uuid
                  AND c.name = :collection_name
                  AND e.cmetadata->>'source' = :source
                """
            ),
            {
                "collection_name": settings.rag_collection_name,
                "source": source,
            },
        )
        self.db.commit()

    def _has_vector_tables(self) -> bool:
        if self.db is None:
            return False

        table_status = self.db.execute(
            text(
                """
                SELECT
                    to_regclass('public.langchain_pg_collection') IS NOT NULL
                        AS has_collection_table,
                    to_regclass('public.langchain_pg_embedding') IS NOT NULL
                        AS has_embedding_table
                """
            ),
        ).mappings().one()

        return bool(
            table_status["has_collection_table"]
            and table_status["has_embedding_table"]
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

    def get_status(self) -> dict:
        if self.db is None:
            return {
                "collection_name": settings.rag_collection_name,
                "document_count": 0,
                "embedding_count": 0,
                "ready": False,
            }

        if not self._has_vector_tables():
            return {
                "collection_name": settings.rag_collection_name,
                "document_count": 0,
                "embedding_count": 0,
                "ready": False,
            }

        row = self.db.execute(
            text(
                """
                SELECT
                    COUNT(DISTINCT e.cmetadata->>'source') AS document_count,
                    COUNT(e.id) AS embedding_count
                FROM langchain_pg_collection c
                LEFT JOIN langchain_pg_embedding e
                    ON e.collection_id = c.uuid
                WHERE c.name = :collection_name
                """
            ),
            {"collection_name": settings.rag_collection_name},
        ).mappings().one()
        document_count = int(row["document_count"] or 0)
        embedding_count = int(row["embedding_count"] or 0)

        return {
            "collection_name": settings.rag_collection_name,
            "document_count": document_count,
            "embedding_count": embedding_count,
            "ready": embedding_count > 0,
        }
