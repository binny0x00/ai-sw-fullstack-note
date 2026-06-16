from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

VECTOR_DIMENSIONS = 1536


class PgVectorStore:
    def __init__(self, db: Session) -> None:
        self.db = db

    def upsert_chunks(
        self,
        chunks: list[dict[str, Any]],
        embeddings: list[list[float]],
    ) -> None:
        for chunk, embedding in zip(chunks, embeddings):
            self.db.execute(
                text(
                    """
                    INSERT INTO document_chunks (
                        id,
                        source,
                        title,
                        category,
                        chunk_index,
                        content,
                        embedding
                    )
                    VALUES (
                        :id,
                        :source,
                        :title,
                        :category,
                        :chunk_index,
                        :content,
                        CAST(:embedding AS vector)
                    )
                    ON CONFLICT (id)
                    DO UPDATE SET
                        source = EXCLUDED.source,
                        title = EXCLUDED.title,
                        category = EXCLUDED.category,
                        chunk_index = EXCLUDED.chunk_index,
                        content = EXCLUDED.content,
                        embedding = EXCLUDED.embedding
                    """
                ),
                {
                    **chunk,
                    "embedding": _to_vector_literal(embedding),
                },
            )

        self.db.commit()

    def search(
        self,
        query_embedding: list[float],
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        rows = self.db.execute(
            text(
                """
                SELECT
                    content,
                    source,
                    title,
                    category,
                    embedding <=> CAST(:query_embedding AS vector) AS distance
                FROM document_chunks
                ORDER BY embedding <=> CAST(:query_embedding AS vector)
                LIMIT :top_k
                """
            ),
            {
                "query_embedding": _to_vector_literal(query_embedding),
                "top_k": top_k,
            },
        ).mappings()

        return [dict(row) for row in rows]


def _to_vector_literal(embedding: list[float]) -> str:
    if len(embedding) != VECTOR_DIMENSIONS:
        raise ValueError(
            f"Expected {VECTOR_DIMENSIONS} dimensions, got {len(embedding)}."
        )

    return "[" + ",".join(str(value) for value in embedding) + "]"
