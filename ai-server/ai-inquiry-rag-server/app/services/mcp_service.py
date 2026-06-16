import json

from sqlalchemy import text
from sqlalchemy.orm import Session


class McpService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_github_issue_log(
        self,
        inquiry: dict,
        approved: bool,
        repository: str,
    ) -> dict:
        if not approved:
            status = "skipped"
            response_payload = {
                "message": "Manager did not approve GitHub Issue creation.",
            }
        else:
            status = "prepared"
            response_payload = {
                "message": (
                    "GitHub Issue creation is prepared. "
                    "Connect a real MCP GitHub tool or GitHub API client here."
                ),
                "title": f"[{inquiry.get('inquiry_type') or 'Issue'}] {inquiry['title']}",
            }

        request_payload = {
            "repository": repository,
            "title": inquiry["title"],
            "body": inquiry["body"],
            "inquiry_type": inquiry.get("inquiry_type"),
            "urgency": inquiry.get("urgency"),
            "suggested_action": inquiry.get("suggested_action"),
        }

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
                "inquiry_id": inquiry["id"],
                "status": status,
                "request_payload": json.dumps(request_payload),
                "response_payload": json.dumps(response_payload),
            },
        ).mappings().one()
        self.db.commit()

        return dict(row)

