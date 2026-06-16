from pathlib import Path


def load_markdown_documents(docs_dir: str = "docs") -> list[dict[str, str]]:
    documents: list[dict[str, str]] = []

    for path in sorted(Path(docs_dir).glob("*.md")):
        content = path.read_text(encoding="utf-8")
        title = _extract_title(content, fallback=path.stem)

        documents.append(
            {
                "source": path.name,
                "title": title,
                "category": _guess_category(path.name),
                "content": content,
            }
        )

    return documents


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

