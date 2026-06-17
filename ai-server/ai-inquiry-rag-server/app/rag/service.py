from langchain_core.documents import Document
from sqlalchemy.orm import Session

from app.rag.loader import load_markdown_document, load_markdown_documents
from app.rag.splitter import split_text
from app.rag.vector_store import PgVectorStore


class RagService:
    def __init__(self, db: Session) -> None:
        self.vector_store = PgVectorStore(db)

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

    def get_status(self) -> dict:
        return self.vector_store.get_status()

    def index_all_markdown_documents(self, docs_dir: str = "docs") -> dict:
        raw_documents = load_markdown_documents(docs_dir)
        documents: list[Document] = []
        ids: list[str] = []

        for raw_document in raw_documents:
            chunks = split_text(raw_document["content"])

            for index, chunk in enumerate(chunks):
                ids.append(f"{raw_document['source']}:{index}")
                documents.append(
                    Document(
                        page_content=chunk,
                        metadata={
                            "source": raw_document["source"],
                            "title": raw_document["title"],
                            "category": raw_document["category"],
                            "chunk_index": index,
                        },
                    )
                )

        if documents:
            self.vector_store.replace_documents(documents, ids)

        return {
            "document_count": len(raw_documents),
            "embedding_count": len(documents),
            "indexed": bool(documents),
        }

    def index_markdown_file(self, file_path: str) -> dict:
        raw_document = load_markdown_document(file_path)
        source = raw_document["source"]
        chunks = split_text(raw_document["content"])
        documents = [
            Document(
                page_content=chunk,
                metadata={
                    "source": source,
                    "title": raw_document["title"],
                    "category": raw_document["category"],
                    "chunk_index": index,
                },
            )
            for index, chunk in enumerate(chunks)
        ]
        ids = [f"{source}:{index}" for index in range(len(documents))]

        self.vector_store.delete_by_source(source)

        if documents:
            self.vector_store.upsert_documents(documents, ids)

        return {
            "source": source,
            "chunk_count": len(documents),
            "indexed": bool(documents),
        }

    def index_post(self, post: dict) -> dict:
        source = f"post:{post['id']}"
        tag_text = " ".join([f"#{tag}" for tag in post.get("tags", [])])
        content = "\n\n".join(
            [
                f"# {post['title']}",
                f"작성자: {post.get('author') or 'unknown'}",
                f"태그: {tag_text or '없음'}",
                post["content"],
            ]
        )
        chunks = split_text(content)
        documents = [
            Document(
                page_content=chunk,
                metadata={
                    "source": source,
                    "title": post["title"],
                    "category": "post",
                    "post_id": post["id"],
                    "chunk_index": index,
                },
            )
            for index, chunk in enumerate(chunks)
        ]
        ids = [f"{source}:{index}" for index in range(len(documents))]

        self.vector_store.delete_by_source(source)

        if documents:
            self.vector_store.upsert_documents(documents, ids)

        return {
            "source": source,
            "chunk_count": len(documents),
            "indexed": bool(documents),
        }

    def delete_post(self, post_id: int) -> dict:
        source = f"post:{post_id}"
        self.vector_store.delete_by_source(source)

        return {
            "source": source,
            "deleted": True,
        }


def _document_to_search_result(document: Document) -> dict:
    return {
        "content": document.page_content,
        "source": document.metadata["source"],
        "title": document.metadata["title"],
        "category": document.metadata["category"],
        "distance": document.metadata.get("distance", 0.0),
    }
