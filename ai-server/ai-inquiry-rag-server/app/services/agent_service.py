import json

from fastapi import HTTPException
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from openai import OpenAIError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.rag.service import RagService
from app.services.inquiry_service import InquiryService


class AgentService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            model=settings.openai_chat_model,
            temperature=0,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
        self.analysis_chain = _build_analysis_chain(self.llm)
        self.rag_service = RagService(db)
        self.inquiry_service = InquiryService(db)

    def analyze(self, inquiry: dict) -> dict:
        query = f"{inquiry['title']}\n\n{inquiry['body']}"
        try:
            documents = self.rag_service.retrieve(query, top_k=5)
        except OpenAIError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"OpenAI embedding request failed: {exc}",
            ) from exc
        except SQLAlchemyError as exc:
            raise HTTPException(
                status_code=500,
                detail=f"RAG database search failed: {exc}",
            ) from exc

        context = self.rag_service.build_context_from_documents(documents)
        references = sorted({document.metadata["source"] for document in documents})

        try:
            analysis = self.analysis_chain.invoke(
                {
                    "title": inquiry["title"],
                    "body": inquiry["body"],
                    "context": context,
                }
            )
        except OpenAIError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"OpenAI API request failed: {exc}",
            ) from exc

        analysis = _parse_analysis(analysis)
        analysis["references"] = references

        try:
            self._save_analysis(inquiry["id"], analysis)
            self.inquiry_service.update_analysis_summary(
                inquiry_id=inquiry["id"],
                inquiry_type=analysis["inquiry_type"],
                urgency=analysis["urgency"],
                ai_summary=analysis["answer_draft"],
                suggested_action=analysis["suggested_action"],
            )
        except SQLAlchemyError as exc:
            self.db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Analysis database save failed: {exc}",
            ) from exc

        return {
            "inquiry_id": inquiry["id"],
            **analysis,
        }

    def _save_analysis(self, inquiry_id: int, analysis: dict) -> None:
        self.db.execute(
            text(
                """
                INSERT INTO ai_analysis_results (
                    inquiry_id,
                    inquiry_type,
                    urgency,
                    answer_draft,
                    suggested_action,
                    "references"
                )
                VALUES (
                    :inquiry_id,
                    :inquiry_type,
                    :urgency,
                    :answer_draft,
                    :suggested_action,
                    CAST(:references AS jsonb)
                )
                """
            ),
            {
                "inquiry_id": inquiry_id,
                "inquiry_type": analysis["inquiry_type"],
                "urgency": analysis["urgency"],
                "answer_draft": analysis["answer_draft"],
                "suggested_action": analysis["suggested_action"],
                "references": json.dumps(analysis["references"]),
            },
        )
        self.db.commit()


def _parse_analysis(content: str) -> dict:
    if isinstance(content, dict):
        analysis = content
    else:
        analysis = _loads_analysis(content)

    required_fields = [
        "inquiry_type",
        "urgency",
        "answer_draft",
        "suggested_action",
    ]
    missing_fields = [field for field in required_fields if field not in analysis]

    if missing_fields:
        raise HTTPException(
            status_code=502,
            detail=f"AI response missing fields: {missing_fields}",
        )

    return analysis


def _loads_analysis(content: str) -> dict:
    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"AI response was not valid JSON: {content}",
        ) from exc


def _build_analysis_chain(llm: ChatOpenAI):
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                (
                    "너는 문의 처리 관리자 시스템의 AI Agent다. "
                    "RAG 참고 문서만 근거로 문의 유형, 긴급도, 답변 초안, "
                    "외부 액션 필요 여부를 판단한다. "
                    "문의 유형은 bug, feature_request, question, account, "
                    "other 중 하나다. 긴급도는 low, medium, high 중 하나다. "
                    "suggested_action은 github_issue_recommended, "
                    "answer_only, needs_human_review 중 하나다. "
                    "반드시 json 객체로만 답변한다."
                ),
            ),
            (
                "user",
                (
                    "문의 제목:\n{title}\n\n"
                    "문의 내용:\n{body}\n\n"
                    "참고 문서:\n{context}\n\n"
                    "json 필드: inquiry_type, urgency, answer_draft, "
                    "suggested_action"
                ),
            ),
        ]
    )

    return prompt | llm | JsonOutputParser()
