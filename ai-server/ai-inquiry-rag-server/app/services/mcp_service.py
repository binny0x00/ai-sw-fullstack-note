import json
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services import github_mcp_client


PROJECT_ROOT = Path(__file__).resolve().parents[2]
GITHUB_MCP_SERVER_PATH = PROJECT_ROOT / "scripts" / "github_mcp_server.py"


class McpService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def search_github_issues_log(
        self,
        inquiry: dict,
        repository: str,
        query: str | list[str],
    ) -> dict:
        queries = _normalize_search_queries(query)
        request_payload = {
            "mcp_server": str(GITHUB_MCP_SERVER_PATH),
            "tool_name": github_mcp_client.GITHUB_ISSUE_SEARCH_TOOL_NAME,
            "repository": repository,
            "query": queries[0] if queries else "",
            "queries": queries,
            "inquiry_id": inquiry["id"],
        }
        response_payload = _search_github_issues(repository, queries)
        status = response_payload.get("status", "failed")

        return self._save_execution_log(
            inquiry_id=inquiry["id"],
            tool_name="github_issue_search",
            status=status,
            request_payload=request_payload,
            response_payload=response_payload,
        )

    def create_github_issue_log(
        self,
        inquiry: dict,
        approved: bool,
        repository: str,
        action: str = "create",
        issue_number: int | None = None,
    ) -> dict:
        issue_title = f"[{inquiry.get('inquiry_type') or 'Issue'}] {inquiry['title']}"
        issue_body = _build_github_issue_body(inquiry)
        request_payload = _build_request_payload(
            inquiry=inquiry,
            repository=repository,
            issue_title=issue_title,
            issue_body=issue_body,
            action=action,
            issue_number=issue_number,
        )

        if not approved:
            return self._save_execution_log(
                inquiry_id=inquiry["id"],
                tool_name="github_issue",
                status="skipped",
                request_payload=request_payload,
                response_payload={
                    "message": "Manager did not approve GitHub Issue creation.",
                },
            )

        if action == "comment":
            if issue_number is None:
                raise HTTPException(
                    status_code=400,
                    detail="issue_number is required when action is comment.",
                )

            response_payload = github_mcp_client.add_comment_to_github_issue(
                repository=repository,
                issue_number=issue_number,
                body=_build_github_issue_comment_body(inquiry),
            )
            tool_name = "github_issue_comment"
            success_statuses = {"commented"}
        else:
            response_payload = github_mcp_client.create_github_issue(
                repository=repository,
                title=issue_title,
                body=issue_body,
            )
            tool_name = "github_issue"
            success_statuses = {"created", "project_skipped"}

        status = response_payload.get("status", "failed")
        log = self._save_execution_log(
            inquiry_id=inquiry["id"],
            tool_name=tool_name,
            status=status,
            request_payload=request_payload,
            response_payload=response_payload,
        )

        if status not in success_statuses:
            raise HTTPException(status_code=502, detail=response_payload)

        return log

    def _save_execution_log(
        self,
        inquiry_id: int,
        tool_name: str,
        status: str,
        request_payload: dict,
        response_payload: dict,
    ) -> dict:
        row = self.db.execute(
            text(
                """
                INSERT INTO mcp_execution_logs (
                    inquiry_id,
                    tool_name,
                    status,
                    request_payload,
                    response_payload
                )
                VALUES (
                    :inquiry_id,
                    :tool_name,
                    :status,
                    CAST(:request_payload AS jsonb),
                    CAST(:response_payload AS jsonb)
                )
                RETURNING *
                """
            ),
            {
                "inquiry_id": inquiry_id,
                "tool_name": tool_name,
                "status": status,
                "request_payload": json.dumps(request_payload),
                "response_payload": json.dumps(response_payload),
            },
        ).mappings().one()
        self.db.commit()

        return dict(row)


def _normalize_search_queries(query: str | list[str]) -> list[str]:
    raw_queries = query if isinstance(query, list) else [query]
    queries: list[str] = []

    for raw_query in raw_queries:
        cleaned_query = " ".join(str(raw_query).split())

        if cleaned_query and cleaned_query not in queries:
            queries.append(cleaned_query)

    return queries[:5]


def _search_github_issues(repository: str, queries: list[str]) -> dict:
    if not queries:
        return {
            "status": "ok",
            "message": "No GitHub Issue search query was generated.",
            "queries": [],
            "searches": [],
            "issues": [],
        }

    searches: list[dict] = []
    merged_issues: dict[str, dict] = {}

    for query in queries:
        search_result = github_mcp_client.search_github_issues(
            repository=repository,
            query=query,
        )
        searches.append(search_result)

        for issue in search_result.get("issues", []):
            issue_key = str(issue.get("number") or issue.get("url") or issue)
            merged_issues[issue_key] = issue

    successful_searches = [
        search for search in searches if search.get("status") == "ok"
    ]
    status = "ok" if successful_searches else searches[0].get("status", "failed")
    message = (
        "GitHub Issue search completed."
        if status == "ok"
        else searches[0].get("message", "GitHub Issue search failed.")
    )

    return {
        "status": status,
        "message": message,
        "queries": queries,
        "searches": searches,
        "issues": list(merged_issues.values()),
        "total_count": len(merged_issues),
    }


def _build_request_payload(
    inquiry: dict,
    repository: str,
    issue_title: str,
    issue_body: str,
    action: str = "create",
    issue_number: int | None = None,
) -> dict:
    return {
        "mcp_server": str(GITHUB_MCP_SERVER_PATH),
        "tool_name": (
            github_mcp_client.GITHUB_ISSUE_COMMENT_TOOL_NAME
            if action == "comment"
            else github_mcp_client.GITHUB_ISSUE_TOOL_NAME
        ),
        "action": action,
        "repository": repository,
        "issue_number": issue_number,
        "title": issue_title,
        "body": issue_body,
        "inquiry_id": inquiry["id"],
        "inquiry_type": inquiry.get("inquiry_type"),
        "urgency": inquiry.get("urgency"),
        "suggested_action": inquiry.get("suggested_action"),
    }


def _build_github_issue_comment_body(inquiry: dict) -> str:
    return "\n\n".join(
        [
            "## 추가 문의",
            inquiry["body"],
            "## AI 분석 요약",
            inquiry.get("ai_summary") or "아직 AI 분석 요약이 없습니다.",
            "## 메타데이터",
            "\n".join(
                [
                    f"- inquiry_id: {inquiry['id']}",
                    f"- inquiry_type: {inquiry.get('inquiry_type') or 'unknown'}",
                    f"- urgency: {inquiry.get('urgency') or 'unknown'}",
                    (
                        "- suggested_action: "
                        f"{inquiry.get('suggested_action') or 'unknown'}"
                    ),
                    f"- customer_email: {inquiry.get('customer_email') or 'unknown'}",
                ]
            ),
        ]
    )


def _build_github_issue_body(inquiry: dict) -> str:
    return "\n\n".join(
        [
            "## 문의 내용",
            inquiry["body"],
            "## AI 분석 요약",
            inquiry.get("ai_summary") or "아직 AI 분석 요약이 없습니다.",
            "## 메타데이터",
            "\n".join(
                [
                    f"- inquiry_id: {inquiry['id']}",
                    f"- inquiry_type: {inquiry.get('inquiry_type') or 'unknown'}",
                    f"- urgency: {inquiry.get('urgency') or 'unknown'}",
                    (
                        "- suggested_action: "
                        f"{inquiry.get('suggested_action') or 'unknown'}"
                    ),
                    f"- customer_email: {inquiry.get('customer_email') or 'unknown'}",
                ]
            ),
        ]
    )
