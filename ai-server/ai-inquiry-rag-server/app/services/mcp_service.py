import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from mcp import ClientSession
from mcp import StdioServerParameters
from mcp.client.stdio import stdio_client
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings


PROJECT_ROOT = Path(__file__).resolve().parents[2]
GITHUB_MCP_SERVER_PATH = PROJECT_ROOT / "scripts" / "github_mcp_server.py"
GITHUB_ISSUE_TOOL_NAME = "create_github_issue_with_project"


class McpService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_github_issue_log(
        self,
        inquiry: dict,
        approved: bool,
        repository: str,
    ) -> dict:
        issue_title = f"[{inquiry.get('inquiry_type') or 'Issue'}] {inquiry['title']}"
        issue_body = _build_github_issue_body(inquiry)
        request_payload = _build_request_payload(
            inquiry=inquiry,
            repository=repository,
            issue_title=issue_title,
            issue_body=issue_body,
        )

        if not approved:
            return self._save_execution_log(
                inquiry_id=inquiry["id"],
                status="skipped",
                request_payload=request_payload,
                response_payload={
                    "message": "Manager did not approve GitHub Issue creation.",
                },
            )

        response_payload = _call_github_mcp_tool(
            repository=repository,
            title=issue_title,
            body=issue_body,
        )

        status = response_payload.get("status", "failed")
        log = self._save_execution_log(
            inquiry_id=inquiry["id"],
            status=status,
            request_payload=request_payload,
            response_payload=response_payload,
        )

        if status not in {"created", "project_skipped"}:
            raise HTTPException(status_code=502, detail=response_payload)

        return log

    def _save_execution_log(
        self,
        inquiry_id: int,
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
                    'github_issue',
                    :status,
                    CAST(:request_payload AS jsonb),
                    CAST(:response_payload AS jsonb)
                )
                RETURNING *
                """
            ),
            {
                "inquiry_id": inquiry_id,
                "status": status,
                "request_payload": json.dumps(request_payload),
                "response_payload": json.dumps(response_payload),
            },
        ).mappings().one()
        self.db.commit()

        return dict(row)


def _call_github_mcp_tool(repository: str, title: str, body: str) -> dict:
    if settings.github_token is None or settings.github_token.strip() == "":
        return {
            "status": "failed",
            "message": "GITHUB_TOKEN is required to call the GitHub MCP server.",
        }

    try:
        return asyncio.run(_call_github_mcp_tool_async(repository, title, body))
    except RuntimeError as exc:
        return {
            "status": "failed",
            "message": "GitHub MCP tool call failed.",
            "error": str(exc),
        }


async def _call_github_mcp_tool_async(
    repository: str,
    title: str,
    body: str,
) -> dict:
    server_params = StdioServerParameters(
        command=sys.executable,
        args=[str(GITHUB_MCP_SERVER_PATH)],
        env=_build_mcp_server_env(),
    )

    async with stdio_client(server_params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            result = await session.call_tool(
                GITHUB_ISSUE_TOOL_NAME,
                {
                    "repository": repository,
                    "title": title,
                    "body": body,
                    "project_owner": settings.github_project_owner,
                    "project_title": settings.github_project_title,
                    "status_field": settings.github_project_status_field,
                    "status_option": settings.github_project_status_option,
                },
            )

    if result.isError:
        return {
            "status": "failed",
            "message": "GitHub MCP tool returned an error.",
            "content": _extract_mcp_content(result.content),
        }

    return _parse_mcp_tool_result(result.content)


def _build_mcp_server_env() -> dict[str, str]:
    env = dict(os.environ)
    env["GITHUB_TOKEN"] = settings.github_token or ""
    env["GITHUB_PROJECT_TITLE"] = settings.github_project_title
    env["GITHUB_PROJECT_STATUS_FIELD"] = settings.github_project_status_field

    if settings.github_project_owner is not None:
        env["GITHUB_PROJECT_OWNER"] = settings.github_project_owner

    if settings.github_project_status_option is not None:
        env["GITHUB_PROJECT_STATUS_OPTION"] = settings.github_project_status_option

    return env


def _parse_mcp_tool_result(content: list[Any]) -> dict:
    text = _extract_mcp_content(content)

    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return {
            "status": "failed",
            "message": "GitHub MCP tool returned non-JSON content.",
            "content": text,
        }

    if not isinstance(payload, dict):
        return {
            "status": "failed",
            "message": "GitHub MCP tool returned an unexpected payload.",
            "content": payload,
        }

    return payload


def _extract_mcp_content(content: list[Any]) -> str:
    if not content:
        return ""

    first_content = content[0]
    return getattr(first_content, "text", str(first_content))


def _build_request_payload(
    inquiry: dict,
    repository: str,
    issue_title: str,
    issue_body: str,
) -> dict:
    return {
        "mcp_server": str(GITHUB_MCP_SERVER_PATH),
        "tool_name": GITHUB_ISSUE_TOOL_NAME,
        "repository": repository,
        "title": issue_title,
        "body": issue_body,
        "inquiry_id": inquiry["id"],
        "inquiry_type": inquiry.get("inquiry_type"),
        "urgency": inquiry.get("urgency"),
        "suggested_action": inquiry.get("suggested_action"),
    }


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
