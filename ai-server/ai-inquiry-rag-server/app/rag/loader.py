from pathlib import Path


def load_markdown_documents(docs_dir: str = "docs") -> list[dict[str, str]]:
    documents: list[dict[str, str]] = []

    for path in sorted(Path(docs_dir).glob("*.md")):
        documents.append(load_markdown_document(str(path)))

    return documents


def load_markdown_document(file_path: str) -> dict[str, str]:
    path = Path(file_path)
    content = path.read_text(encoding="utf-8")
    title = _extract_title(content, fallback=path.stem)

    return {
        "source": path.name,
        "title": title,
        "category": _guess_category(path.name),
        "content": content,
    }


def _extract_title(content: str, fallback: str) -> str:
    for line in content.splitlines():
        if line.startswith("# "):
            return line.removeprefix("# ").strip()

    return fallback


def _guess_category(file_name: str) -> str:
    if file_name.startswith("past-"):
        return "past_issue"
    if "api" in file_name:
        return "api_doc"
    if "faq" in file_name:
        return "faq"

    return "manual"
