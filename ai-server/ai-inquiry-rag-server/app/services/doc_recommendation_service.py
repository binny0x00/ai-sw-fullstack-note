from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.rag.service import RagService


DOCS_DIR = Path(__file__).resolve().parents[2] / "docs"


class DocRecommendationService:
    def __init__(self, db: Session | None = None) -> None:
        self.db = db

    def read(self, file_name: str) -> dict:
        path = self._resolve_doc_path(file_name)

        return {
            "file": path.name,
            "content": path.read_text(encoding="utf-8"),
        }

    def update(self, file_name: str, content: str) -> dict:
        path = self._resolve_doc_path(file_name)
        path.write_text(content, encoding="utf-8")
        index_result = self._index_document(path)

        return {
            "file": path.name,
            "content": content,
            "updated": True,
            "index_result": index_result,
        }

    def apply(self, file_name: str, suggestion: str) -> dict:
        path = self._resolve_doc_path(file_name)
        appended_text = _build_append_text(suggestion)

        with path.open("a", encoding="utf-8") as file:
            file.write(appended_text)
        index_result = self._index_document(path)

        return {
            "file": path.name,
            "applied": True,
            "appended_text": appended_text.strip(),
            "index_result": index_result,
        }

    def _index_document(self, path: Path) -> dict | None:
        if self.db is None:
            return None

        return RagService(self.db).index_markdown_file(str(path))

    def _resolve_doc_path(self, file_name: str) -> Path:
        if "/" in file_name or "\\" in file_name or not file_name.endswith(".md"):
            raise HTTPException(status_code=400, detail="Invalid markdown file name.")

        path = (DOCS_DIR / file_name).resolve()
        docs_dir = DOCS_DIR.resolve()

        if docs_dir not in path.parents or not path.exists():
            raise HTTPException(status_code=404, detail="Markdown document not found.")

        return path


def _build_append_text(suggestion: str) -> str:
    return (
        "\n\n"
        "## AI 문서 보강 메모\n\n"
        f"- {suggestion.strip()}\n"
    )
