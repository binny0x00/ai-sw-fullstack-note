import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_ROOT))

from app.database import SessionLocal
from app.rag.embeddings import EmbeddingService
from app.rag.loader import load_markdown_documents
from app.rag.splitter import split_text
from app.rag.vector_store import PgVectorStore


def main() -> None:
    raw_documents = load_markdown_documents("docs")
    chunks: list[dict] = []

    for document in raw_documents:
        split_chunks = split_text(document["content"])

        for index, chunk in enumerate(split_chunks):
            chunks.append(
                {
                    "id": f"{document['source']}:{index}",
                    "source": document["source"],
                    "title": document["title"],
                    "category": document["category"],
                    "chunk_index": index,
                    "content": chunk,
                }
            )

    if not chunks:
        print("No documents found.")
        return

    embeddings = EmbeddingService().create_many(
        [chunk["content"] for chunk in chunks]
    )

    db = SessionLocal()
    try:
        PgVectorStore(db).upsert_chunks(chunks, embeddings)
    finally:
        db.close()

    print(f"Ingested {len(chunks)} chunks from {len(raw_documents)} documents.")


if __name__ == "__main__":
    main()
