from typing import Any, TypedDict

from langchain_core.documents import Document


class AgentState(TypedDict):
    inquiry: dict[str, Any]
    query: str
    documents: list[Document]
    context: str
    references: list[str]
    mcp_results: list[dict[str, Any]]
    mcp_context: str
    doc_recommendations: list[str]
    analysis: dict[str, Any]
    tool_calls: list[dict[str, Any]]
    tool_loop_count: int
    tool_loop_complete: bool
