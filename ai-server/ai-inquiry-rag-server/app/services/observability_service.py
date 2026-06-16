import json

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


class ObservabilityService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def log_agent_step(
        self,
        step_name: str,
        status: str,
        duration_ms: int,
        inquiry_id: int | None = None,
        input_payload: dict | None = None,
        output_payload: dict | None = None,
    ) -> None:
        self.db.execute(
            text(
                """
                INSERT INTO agent_step_logs (
                    inquiry_id,
                    step_name,
                    status,
                    duration_ms,
                    input_payload,
                    output_payload
                )
                VALUES (
                    :inquiry_id,
                    :step_name,
                    :status,
                    :duration_ms,
                    CAST(:input_payload AS jsonb),
                    CAST(:output_payload AS jsonb)
                )
                """
            ),
            {
                "inquiry_id": inquiry_id,
                "step_name": step_name,
                "status": status,
                "duration_ms": duration_ms,
                "input_payload": json.dumps(input_payload or {}),
                "output_payload": json.dumps(output_payload or {}),
            },
        )
        self.db.commit()

    def log_api_request(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_ms: int,
    ) -> None:
        self.db.execute(
            text(
                """
                INSERT INTO api_request_logs (
                    method,
                    path,
                    status_code,
                    duration_ms,
                    failed
                )
                VALUES (
                    :method,
                    :path,
                    :status_code,
                    :duration_ms,
                    :failed
                )
                """
            ),
            {
                "method": method,
                "path": path,
                "status_code": status_code,
                "duration_ms": duration_ms,
                "failed": status_code >= 400,
            },
        )
        self.db.commit()

    def get_summary(self) -> dict:
        if not self._has_table("api_request_logs"):
            api_summary = _empty_api_summary()
        else:
            api_summary = self._get_api_summary()

        if not self._has_table("agent_step_logs"):
            agent_summary = _empty_agent_summary()
            recent_steps = []
        else:
            agent_summary = self._get_agent_summary()
            recent_steps = self._get_recent_steps()

        if not self._has_table("mcp_execution_logs"):
            mcp_summary = _empty_mcp_summary()
        else:
            mcp_summary = self._get_mcp_summary()

        return {
            "api": _normalize_numeric(dict(api_summary)),
            "agent": _normalize_numeric(dict(agent_summary)),
            "mcp": _normalize_numeric(dict(mcp_summary)),
            "recent_steps": recent_steps,
        }

    def _has_table(self, table_name: str) -> bool:
        try:
            row = self.db.execute(
                text("SELECT to_regclass(:table_name) IS NOT NULL AS exists"),
                {"table_name": f"public.{table_name}"},
            ).mappings().one()
        except SQLAlchemyError:
            self.db.rollback()
            return False

        return bool(row["exists"])

    def _get_api_summary(self) -> dict:
        return dict(
            self.db.execute(
                text(
                    """
                    SELECT
                        COUNT(*) AS request_count,
                        COALESCE(AVG(duration_ms), 0) AS average_duration_ms,
                        COALESCE(
                            AVG(CASE WHEN failed THEN 1 ELSE 0 END),
                            0
                        ) AS failure_rate
                    FROM api_request_logs
                    WHERE created_at >= now() - interval '24 hours'
                    """
                )
            ).mappings().one()
        )

    def _get_agent_summary(self) -> dict:
        return dict(
            self.db.execute(
                text(
                    """
                    SELECT
                        COUNT(*) AS step_count,
                        COALESCE(AVG(duration_ms), 0) AS average_step_duration_ms,
                        COALESCE(
                            AVG(CASE WHEN step_name = 'generate' THEN duration_ms END),
                            0
                        ) AS average_llm_duration_ms
                    FROM agent_step_logs
                    WHERE created_at >= now() - interval '24 hours'
                    """
                )
            ).mappings().one()
        )

    def _get_mcp_summary(self) -> dict:
        return dict(
            self.db.execute(
                text(
                    """
                    SELECT
                        COUNT(*) AS call_count,
                        COALESCE(
                            AVG(CASE WHEN status IN ('failed', 'error') THEN 1 ELSE 0 END),
                            0
                        ) AS failure_rate
                    FROM mcp_execution_logs
                    WHERE created_at >= now() - interval '24 hours'
                    """
                )
            ).mappings().one()
        )

    def _get_recent_steps(self) -> list[dict]:
        rows = self.db.execute(
            text(
                """
                SELECT
                    inquiry_id,
                    step_name,
                    status,
                    duration_ms,
                    output_payload,
                    created_at
                FROM agent_step_logs
                ORDER BY created_at DESC
                LIMIT 10
                """
            )
        ).mappings()

        return [dict(row) for row in rows]


def _normalize_numeric(row: dict) -> dict:
    normalized = {}

    for key, value in row.items():
        if value is None:
            normalized[key] = 0
        elif hasattr(value, "__float__"):
            normalized[key] = float(value)
        else:
            normalized[key] = value

    return normalized


def _empty_api_summary() -> dict:
    return {
        "request_count": 0,
        "average_duration_ms": 0,
        "failure_rate": 0,
    }


def _empty_agent_summary() -> dict:
    return {
        "step_count": 0,
        "average_step_duration_ms": 0,
        "average_llm_duration_ms": 0,
    }


def _empty_mcp_summary() -> dict:
    return {
        "call_count": 0,
        "failure_rate": 0,
    }
