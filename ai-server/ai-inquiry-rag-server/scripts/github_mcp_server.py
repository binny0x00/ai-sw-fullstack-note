import json
import os
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP


GITHUB_ISSUES_API_BASE_URL = "https://api.github.com/repos"
GITHUB_SEARCH_API_URL = "https://api.github.com/search/issues"
GITHUB_GRAPHQL_API_URL = "https://api.github.com/graphql"

mcp = FastMCP("github-issue-project-server")


@mcp.tool()
def create_github_issue_with_project(
    repository: str,
    title: str,
    body: str,
    project_owner: str | None = None,
    project_title: str = "ai-inquiry",
    status_field: str = "Status",
    status_option: str | None = None,
) -> str:
    """Create a GitHub issue and add it to a GitHub ProjectsV2 board."""
    github_token = _get_github_token()

    issue_result = _create_github_issue(
        github_token=github_token,
        repository=repository,
        title=title,
        body=body,
    )

    if issue_result["status"] != "created":
        return json.dumps(issue_result, ensure_ascii=False)

    project_result = _add_issue_to_project(
        github_token=github_token,
        repository=repository,
        issue_node_id=issue_result["issue_node_id"],
        project_owner=project_owner,
        project_title=project_title,
        status_field=status_field,
        status_option=status_option,
    )
    issue_result["project"] = project_result

    if project_result["status"] == "added":
        issue_result["status"] = "created"
    elif project_result["status"] == "skipped":
        issue_result["status"] = "project_skipped"
    else:
        issue_result["status"] = "project_failed"

    return json.dumps(issue_result, ensure_ascii=False)


@mcp.tool()
def search_github_issues(
    repository: str,
    query: str,
    state: str = "all",
    limit: int = 5,
) -> str:
    """Search GitHub issues in a repository and return compact issue state."""
    github_token = _get_github_token()

    if github_token == "":
        return json.dumps(
            {
                "status": "failed",
                "message": "GITHUB_TOKEN is required.",
                "issues": [],
            },
            ensure_ascii=False,
        )

    safe_limit = min(max(limit, 1), 10)
    search_query = f"repo:{repository} is:issue {query}".strip()

    if state in ("open", "closed"):
        search_query = f"{search_query} state:{state}"

    try:
        response = httpx.get(
            GITHUB_SEARCH_API_URL,
            headers=_github_headers(github_token),
            params={
                "q": search_query,
                "per_page": safe_limit,
            },
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        return json.dumps(
            {
                "status": "failed",
                "message": "GitHub Issue search request failed.",
                "error": str(exc),
                "issues": [],
            },
            ensure_ascii=False,
        )

    payload = _read_json_response(response)

    if not response.is_success:
        return json.dumps(
            {
                "status": "failed",
                "message": "GitHub Issue search failed.",
                "status_code": response.status_code,
                "github_response": payload,
                "issues": [],
            },
            ensure_ascii=False,
        )

    issues = [
        {
            "number": item.get("number"),
            "title": item.get("title"),
            "state": item.get("state"),
            "url": item.get("html_url"),
            "updated_at": item.get("updated_at"),
        }
        for item in payload.get("items", [])[:safe_limit]
    ]

    return json.dumps(
        {
            "status": "ok",
            "query": search_query,
            "total_count": payload.get("total_count", 0),
            "issues": issues,
        },
        ensure_ascii=False,
    )


@mcp.tool()
def add_comment_to_github_issue(
    repository: str,
    issue_number: int,
    body: str,
) -> str:
    """Add a comment to an existing GitHub issue."""
    github_token = _get_github_token()
    result = _add_issue_comment(
        github_token=github_token,
        repository=repository,
        issue_number=issue_number,
        body=body,
    )

    return json.dumps(result, ensure_ascii=False)


def _get_github_token() -> str:
    github_token = os.getenv("GITHUB_TOKEN")
    if github_token is None or github_token.strip() == "":
        return ""
    return github_token


def _create_github_issue(
    github_token: str,
    repository: str,
    title: str,
    body: str,
) -> dict:
    if github_token == "":
        return {
            "status": "failed",
            "message": "GITHUB_TOKEN is required.",
        }

    try:
        response = httpx.post(
            f"{GITHUB_ISSUES_API_BASE_URL}/{repository}/issues",
            headers=_github_headers(github_token),
            json={
                "title": title,
                "body": body,
            },
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        return {
            "status": "failed",
            "message": "GitHub Issue creation request failed.",
            "error": str(exc),
        }

    payload = _read_json_response(response)

    if not response.is_success:
        return {
            "status": "failed",
            "message": "GitHub Issue creation failed.",
            "status_code": response.status_code,
            "github_response": payload,
        }

    return {
        "status": "created",
        "message": "GitHub Issue was created.",
        "issue_number": payload.get("number"),
        "issue_node_id": payload.get("node_id"),
        "issue_url": payload.get("html_url"),
        "api_url": payload.get("url"),
    }


def _add_issue_comment(
    github_token: str,
    repository: str,
    issue_number: int,
    body: str,
) -> dict:
    if github_token == "":
        return {
            "status": "failed",
            "message": "GITHUB_TOKEN is required.",
        }

    try:
        response = httpx.post(
            f"{GITHUB_ISSUES_API_BASE_URL}/{repository}/issues/{issue_number}/comments",
            headers=_github_headers(github_token),
            json={"body": body},
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        return {
            "status": "failed",
            "message": "GitHub Issue comment request failed.",
            "error": str(exc),
        }

    payload = _read_json_response(response)

    if not response.is_success:
        return {
            "status": "failed",
            "message": "GitHub Issue comment failed.",
            "status_code": response.status_code,
            "github_response": payload,
        }

    return {
        "status": "commented",
        "message": "Comment was added to the existing GitHub Issue.",
        "issue_number": issue_number,
        "issue_url": f"https://github.com/{repository}/issues/{issue_number}",
        "comment_url": payload.get("html_url"),
        "comment_id": payload.get("id"),
    }


def _add_issue_to_project(
    github_token: str,
    repository: str,
    issue_node_id: str | None,
    project_owner: str | None,
    project_title: str,
    status_field: str,
    status_option: str | None,
) -> dict:
    if issue_node_id is None:
        return {
            "status": "skipped",
            "message": "GitHub response did not include issue node_id.",
        }

    owner = project_owner or repository.split("/", maxsplit=1)[0]
    project = _find_project_v2(github_token, owner, project_title)

    if project is None:
        return {
            "status": "skipped",
            "message": f"GitHub Project '{project_title}' was not found under '{owner}'.",
        }

    add_item_payload = _run_github_graphql(
        github_token,
        """
        mutation AddIssueToProject($projectId: ID!, $contentId: ID!) {
          addProjectV2ItemById(
            input: {
              projectId: $projectId,
              contentId: $contentId
            }
          ) {
            item {
              id
            }
          }
        }
        """,
        {
            "projectId": project["id"],
            "contentId": issue_node_id,
        },
    )

    if add_item_payload["status"] != "ok":
        return {
            "status": "failed",
            "message": "Failed to add issue to GitHub Project.",
            "github_response": add_item_payload,
        }

    item_id = add_item_payload["data"]["addProjectV2ItemById"]["item"]["id"]
    status_result = _set_project_status(
        github_token=github_token,
        project=project,
        item_id=item_id,
        status_field=status_field,
        status_option=status_option,
    )

    return {
        "status": "added",
        "project_id": project["id"],
        "project_title": project["title"],
        "project_number": project["number"],
        "project_item_id": item_id,
        "status_field": status_result,
    }


def _find_project_v2(
    github_token: str,
    owner: str,
    project_title: str,
) -> dict | None:
    for owner_type in ("user", "organization"):
        payload = _run_github_graphql(
            github_token,
            _build_projects_query(owner_type),
            {"login": owner},
        )

        if payload["status"] == "not_found":
            continue

        if payload["status"] != "ok":
            return None

        projects = payload["data"][owner_type]["projectsV2"]["nodes"]
        for project in projects:
            if project["title"] == project_title:
                return project

    return None


def _build_projects_query(owner_type: str) -> str:
    return f"""
    query FindProject($login: String!) {{
      {owner_type}(login: $login) {{
        projectsV2(first: 100) {{
          nodes {{
            id
            title
            number
            fields(first: 50) {{
              nodes {{
                ... on ProjectV2SingleSelectField {{
                  id
                  name
                  options {{
                    id
                    name
                  }}
                }}
              }}
            }}
          }}
        }}
      }}
    }}
    """


def _set_project_status(
    github_token: str,
    project: dict,
    item_id: str,
    status_field: str,
    status_option: str | None,
) -> dict:
    if status_option is None or status_option.strip() == "":
        return {
            "status": "skipped",
            "message": "Project status option is not configured.",
        }

    field = _find_status_field(project, status_field)
    if field is None:
        return {
            "status": "skipped",
            "message": f"Project field '{status_field}' was not found.",
        }

    option = _find_status_option(field, status_option)
    if option is None:
        return {
            "status": "skipped",
            "message": f"Project status option '{status_option}' was not found.",
        }

    payload = _run_github_graphql(
        github_token,
        """
        mutation SetProjectItemStatus(
          $projectId: ID!,
          $itemId: ID!,
          $fieldId: ID!,
          $optionId: String!
        ) {
          updateProjectV2ItemFieldValue(
            input: {
              projectId: $projectId,
              itemId: $itemId,
              fieldId: $fieldId,
              value: {
                singleSelectOptionId: $optionId
              }
            }
          ) {
            projectV2Item {
              id
            }
          }
        }
        """,
        {
            "projectId": project["id"],
            "itemId": item_id,
            "fieldId": field["id"],
            "optionId": option["id"],
        },
    )

    if payload["status"] != "ok":
        return {
            "status": "failed",
            "message": "Failed to set GitHub Project status.",
            "github_response": payload,
        }

    return {
        "status": "updated",
        "field": field["name"],
        "option": option["name"],
    }


def _find_status_field(project: dict, status_field: str) -> dict | None:
    for field in project["fields"]["nodes"]:
        if field is not None and field.get("name") == status_field:
            return field
    return None


def _find_status_option(field: dict, status_option: str) -> dict | None:
    for option in field.get("options", []):
        if option.get("name") == status_option:
            return option
    return None


def _run_github_graphql(
    github_token: str,
    query: str,
    variables: dict,
) -> dict:
    try:
        response = httpx.post(
            GITHUB_GRAPHQL_API_URL,
            headers=_github_headers(github_token),
            json={
                "query": query,
                "variables": variables,
            },
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        return {
            "status": "failed",
            "message": "GitHub GraphQL request failed.",
            "error": str(exc),
        }

    payload = _read_json_response(response)

    if not response.is_success:
        return {
            "status": "failed",
            "message": "GitHub GraphQL request was rejected.",
            "status_code": response.status_code,
            "github_response": payload,
        }

    errors = payload.get("errors")
    if errors:
        error_types = {
            error.get("type")
            for error in errors
            if error.get("type") is not None
        }
        return {
            "status": "not_found" if "NOT_FOUND" in error_types else "failed",
            "message": "GitHub GraphQL returned errors.",
            "github_errors": errors,
        }

    return {
        "status": "ok",
        "data": payload["data"],
    }


def _github_headers(github_token: str) -> dict[str, str]:
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {github_token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _read_json_response(response: httpx.Response) -> dict[str, Any]:
    try:
        payload = response.json()
    except json.JSONDecodeError:
        payload = {"raw": response.text}

    return payload


if __name__ == "__main__":
    mcp.run(transport="stdio")
