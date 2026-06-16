import sys
from pathlib import Path

from langchain_core.documents import Document

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_ROOT))

from app.rag.loader import load_markdown_documents
from app.rag.splitter import split_text
from app.rag.vector_store import PgVectorStore


def main() -> None:
    raw_documents = load_markdown_documents("docs")
    langchain_documents: list[Document] = []
    ids: list[str] = []

    for document in raw_documents:
        split_chunks = split_text(document["content"])

        for index, chunk in enumerate(split_chunks):
            ids.append(f"{document['source']}:{index}")
            langchain_documents.append(
                Document(
                    page_content=chunk,
                    metadata={
                        "source": document["source"],
                        "title": document["title"],
                        "category": document["category"],
                        "chunk_index": index,
                    },
                )
            )

    if not langchain_documents:
        print("No documents found.")
        return

    PgVectorStore().replace_documents(langchain_documents, ids)

    print(
        f"Ingested {len(langchain_documents)} chunks "
        f"from {len(raw_documents)} documents."
    )


if __name__ == "__main__":
    main()
