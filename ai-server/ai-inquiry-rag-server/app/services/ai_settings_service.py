from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas import AiSettingsUpdate


DEFAULT_AI_SETTINGS = {
    "answer_tone": (
        "고객에게 정중하고 간결하게 답변한다. 문의 의견에 감사하고, "
        "확인 후 안내하겠다는 표현을 사용한다."
    ),
    "technical_issue_policy": (
        "CORS, JWT, API 서버, 환경변수, 백엔드 설정처럼 개발자가 확인해야 하는 "
        "기술 원인은 사용자에게 직접 설명하지 않는다. 개발팀에 전달해 확인 후 "
        "안내하겠다고 답변한다."
    ),
    "escalation_policy": (
        "재현 가능한 오류, 운영 장애, 개발 작업이 필요한 설정 누락은 "
        "GitHub Issue 생성을 권장한다. 자동로그인, 알림, 검색 개선처럼 "
        "새 기능 추가나 기존 기능 개선을 요청하는 문의도 개발팀 검토가 필요하므로 "
        "GitHub Issue 생성을 권장한다."
    ),
    "custom_instructions": "",
}


class AiSettingsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self) -> dict:
        self._ensure_exists()

        row = self.db.execute(
            text(
                """
                SELECT
                    answer_tone,
                    technical_issue_policy,
                    escalation_policy,
                    custom_instructions
                FROM ai_settings
                WHERE id = 1
                """
            )
        ).mappings().one()

        return dict(row)

    def update(self, request: AiSettingsUpdate) -> dict:
        self._ensure_exists()

        row = self.db.execute(
            text(
                """
                UPDATE ai_settings
                SET
                    answer_tone = :answer_tone,
                    technical_issue_policy = :technical_issue_policy,
                    escalation_policy = :escalation_policy,
                    custom_instructions = :custom_instructions,
                    updated_at = now()
                WHERE id = 1
                RETURNING
                    answer_tone,
                    technical_issue_policy,
                    escalation_policy,
                    custom_instructions
                """
            ),
            {
                "answer_tone": request.answer_tone,
                "technical_issue_policy": request.technical_issue_policy,
                "escalation_policy": request.escalation_policy,
                "custom_instructions": request.custom_instructions,
            },
        ).mappings().one()
        self.db.commit()

        return dict(row)

    def _ensure_exists(self) -> None:
        self.db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS ai_settings (
                    id INTEGER PRIMARY KEY DEFAULT 1,
                    answer_tone TEXT NOT NULL DEFAULT '',
                    technical_issue_policy TEXT NOT NULL DEFAULT '',
                    escalation_policy TEXT NOT NULL DEFAULT '',
                    custom_instructions TEXT NOT NULL DEFAULT '',
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    CONSTRAINT ai_settings_singleton CHECK (id = 1)
                )
                """
            )
        )
        self.db.execute(
            text(
                """
                INSERT INTO ai_settings (
                    id,
                    answer_tone,
                    technical_issue_policy,
                    escalation_policy,
                    custom_instructions
                )
                VALUES (
                    1,
                    :answer_tone,
                    :technical_issue_policy,
                    :escalation_policy,
                    :custom_instructions
                )
                ON CONFLICT (id) DO NOTHING
                """
            ),
            DEFAULT_AI_SETTINGS,
        )
        self.db.commit()
