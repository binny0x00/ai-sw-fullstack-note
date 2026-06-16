import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from app.config import settings


PROJECT_ROOT = Path(__file__).resolve().parents[2]
GITHUB_MCP_SERVER_PATH = PROJECT_ROOT / "scripts" / "github_mcp_server.py"
GITHUB_ISSUE_TOOL_NAME = "create_github_issue_with_project"
GITHUB_ISSUE_SEARCH_TOOL_NAME = "search_github_issues"
GITHUB_ISSUE_COMMENT_TOOL_NAME = "add_comment_to_github_issue"


def search_github_issues(repository: str, query: str) -> dict:
    if not _has_github_token():
        return {
            "status": "failed",
            "message": "GITHUB_TOKEN is required to call the GitHub MCP server.",
            "issues": [],
        }

    try:
        return asyncio.run(_search_github_issues_async(repository, query))
    except RuntimeError as exc:
        return {
            "status": "failed",
            "message": "GitHub MCP issue search failed.",
            "error": str(exc),
            "issues": [],
        }


def create_github_issue(repository: str, title: str, body: str) -> dict:
    if not _has_github_token():
        return {
            "status": "failed",
            "message": "GITHUB_TOKEN is required to call the GitHub MCP server.",
        }

    try:
        return asyncio.run(_create_github_issue_async(repository, title, body))
    except RuntimeError as exc:
        return {
            "status": "failed",
            "message": "GitHub MCP tool call failed.",
            "error": str(exc),
        }


def add_comment_to_github_issue(
    repository: str,
    issue_number: int,
    body: str,
) -> dict:
    if not _has_github_token():
        return {
            "status": "failed",
            "message": "GITHUB_TOKEN is required to call the GitHub MCP server.",
        }

    try:
        return asyncio.run(
            _add_comment_to_github_issue_async(repository, issue_number, body)
        )
    except RuntimeError as exc:
        return {
            "status": "failed",
            "message": "GitHub MCP issue comment failed.",
            "error": str(exc),
        }


async def _search_github_issues_async(repository: str, query: str) -> dict:
    result = await _call_tool(
        GITHUB_ISSUE_SEARCH_TOOL_NAME,
        {
            "repository": repository,
            "query": query,
            "state": "all",
            "limit": 5,
        },
    )

    if result.isError:
        return {
            "status": "failed",
            "message": "GitHub MCP issue search returned an error.",
            "content": _extract_mcp_content(result.content),
            "issues": [],
        }

    return _parse_mcp_tool_result(result.content)


async def _add_comment_to_github_issue_async(
    repository: str,
    issue_number: int,
    body: str,
) -> dict:
    result = await _call_tool(
        GITHUB_ISSUE_COMMENT_TOOL_NAME,
        {
            "repository": repository,
            "issue_number": issue_number,
            "body": body,
        },
    )

    if result.isError:
        return {
            "status": "failed",
            "message": "GitHub MCP issue comment returned an error.",
            "content": _extract_mcp_content(result.content),
        }

    return _parse_mcp_tool_result(result.content)


async def _create_github_issue_async(repository: str, title: str, body: str) -> dict:
    result = await _call_tool(
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


async def _call_tool(tool_name: str, arguments: dict):
    server_params = StdioServerParameters(
        command=sys.executable,
        args=[str(GITHUB_MCP_SERVER_PATH)],
        env=_build_mcp_server_env(),
    )

    async with stdio_client(server_params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            return await session.call_tool(tool_name, arguments)


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


def _has_github_token() -> bool:
    return bool(settings.github_token and settings.github_token.strip())
