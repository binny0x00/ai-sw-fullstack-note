from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas import InquiryCreate


class InquiryService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, request: InquiryCreate) -> dict:
        row = self.db.execute(
            text(
                """
                INSERT INTO inquiries (title, body, customer_email, post_id)
                VALUES (:title, :body, :customer_email, :post_id)
                RETURNING *
                """
            ),
            request.model_dump(),
        ).mappings().one()
        self.db.commit()

        return dict(row)

    def list_all(self) -> list[dict]:
        rows = self.db.execute(
            text("SELECT * FROM inquiries ORDER BY id DESC")
        ).mappings()
        return [dict(row) for row in rows]

    def get(self, inquiry_id: int) -> dict | None:
        row = self.db.execute(
            text("SELECT * FROM inquiries WHERE id = :id"),
            {"id": inquiry_id},
        ).mappings().first()

        if row is None:
            return None

        return dict(row)

    def update_analysis_summary(
        self,
        inquiry_id: int,
        inquiry_type: str,
        urgency: str,
        ai_summary: str,
        suggested_action: str,
    ) -> None:
        self.db.execute(
            text(
                """
                UPDATE inquiries
                SET
                    status = 'analyzed',
                    inquiry_type = :inquiry_type,
                    urgency = :urgency,
                    ai_summary = :ai_summary,
                    suggested_action = :suggested_action,
                    updated_at = now()
                WHERE id = :inquiry_id
                """
            ),
            {
                "inquiry_id": inquiry_id,
                "inquiry_type": inquiry_type,
                "urgency": urgency,
                "ai_summary": ai_summary,
                "suggested_action": suggested_action,
            },
        )
        self.db.commit()
