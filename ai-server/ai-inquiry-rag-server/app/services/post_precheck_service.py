from fastapi import HTTPException
from langchain_openai import ChatOpenAI
from openai import OpenAIError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import settings
from app.rag.service import RagService
from app.schemas import PostPrecheckRequest
from app.services.agent_prompts import build_post_precheck_chain


CUSTOMER_BURDEN_KEYWORDS = (
    "앱 버전",
    "버전",
    "네트워크",
    "와이파이",
    "wifi",
    "wi-fi",
    "브라우저",
    "os",
    "운영체제",
    "안드로이드",
    "ios",
    "기기",
    "디바이스",
    "재설치",
    "캐시",
    "다시 실행",
    "계속되",
    "문구",
    "아이콘",
    "삭제해 보셨",
    "시도해 보셨",
)


class PostPrecheckService:
    def __init__(self, db: Session) -> None:
        self.rag_service = RagService(db)
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            model=settings.openai_chat_model,
            temperature=0,
            model_kwargs={"response_format": {"type": "json_object"}},
        )

    def check(self, request: PostPrecheckRequest) -> dict:
        query = "\n\n".join(
            [
                request.title,
                request.content,
                f"태그: {', '.join(request.tag_names) or '없음'}",
            ]
        )

        try:
            documents = self.rag_service.retrieve(query, top_k=4)
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
        chain = build_post_precheck_chain(self.llm)

        try:
            result = chain.invoke(
                {
                    "title": request.title,
                    "content": request.content,
                    "tags": ", ".join(request.tag_names) or "없음",
                    "context": context,
                }
            )
        except OpenAIError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"OpenAI precheck request failed: {exc}",
            ) from exc

        return _parse_precheck_result(result, references, request)


def _parse_precheck_result(
    result: object,
    references: list[str],
    request: PostPrecheckRequest,
) -> dict:
    if _has_enough_customer_context(request):
        return _passed_result(
            reason="작성해 주신 내용만으로 문의를 접수할 수 있습니다.",
            references=references,
        )

    if not isinstance(result, dict):
        return _passed_result(
            reason="게시글 접수 전 AI 점검을 완료했습니다.",
            references=references,
        )

    needs_more_info = bool(result.get("needs_more_info"))
    raw_questions = result.get("questions", [])
    questions = raw_questions if isinstance(raw_questions, list) else []
    questions = [str(question).strip() for question in questions if str(question).strip()]
    questions = [
        question
        for question in questions
        if not _is_customer_burden_question(question)
    ][:2]

    return {
        "needs_more_info": needs_more_info and bool(questions),
        "questions": questions,
        "suggested_content": _optional_text(result.get("suggested_content")),
        "reason": str(result.get("reason") or "게시글 접수 전 AI 점검을 완료했습니다."),
        "category": _optional_text(result.get("category")),
        "references": references,
    }


def _passed_result(reason: str, references: list[str]) -> dict:
    return {
        "needs_more_info": False,
        "questions": [],
        "suggested_content": None,
        "reason": reason,
        "category": None,
        "references": references,
    }


def _has_enough_customer_context(request: PostPrecheckRequest) -> bool:
    text = f"{request.title} {request.content}".lower()

    if len(text.strip()) < 25:
        return False

    has_subject = any(
        keyword in text
        for keyword in (
            "앱",
            "화면",
            "로딩",
            "로그인",
            "태그",
            "todo",
            "할일",
            "버튼",
            "입력",
            "저장",
            "삭제",
        )
    )
    has_symptom = any(
        keyword in text
        for keyword in (
            "멈",
            "안넘어",
            "안 넘어",
            "안됨",
            "안 됩니다",
            "오류",
            "실패",
            "느림",
            "사라",
            "등록",
            "저장",
        )
    )

    return has_subject and has_symptom


def _is_customer_burden_question(question: str) -> bool:
    normalized = question.lower()
    return any(keyword in normalized for keyword in CUSTOMER_BURDEN_KEYWORDS)


def _optional_text(value: object) -> str | None:
    if value is None:
        return None

    text = str(value).strip()
    return text or None
