import json
import time

from fastapi import HTTPException
from langchain_openai import ChatOpenAI
from openai import OpenAIError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.rag.service import RagService
from app.services.ai_settings_service import AiSettingsService
from app.services.agent_graph import build_agent_graph
from app.services.agent_prompts import (
    build_analysis_chain,
    build_doc_recommendation_chain,
)
from app.services.agent_state import AgentState
from app.services.inquiry_service import InquiryService
from app.services.mcp_service import McpService
from app.services.observability_service import ObservabilityService


class AgentService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.llm = ChatOpenAI(
            api_key=settings.require_openai_api_key(),
            model=settings.openai_chat_model,
            temperature=0,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
        self.rag_service = RagService(db)
        self.inquiry_service = InquiryService(db)
        self.ai_settings_service = AiSettingsService(db)
        self.mcp_service = McpService(db)
        self.observability_service = ObservabilityService(db)
        self.graph = build_agent_graph(self)

    def analyze(self, inquiry: dict) -> dict:
        initial_state: AgentState = {
            "inquiry": inquiry,
            "query": f"{inquiry['title']}\n\n{inquiry['body']}",
            "documents": [],
            "context": "",
            "references": [],
            "mcp_results": [],
            "mcp_context": "",
            "doc_recommendations": [],
            "analysis": {},
            "tool_calls": [],
            "tool_loop_count": 0,
            "tool_loop_complete": False,
        }

        return self.graph.invoke(initial_state)["analysis"]

    def retrieve_context(self, state: "AgentState") -> "AgentState":
        started_at = time.perf_counter()
        try:
            documents = self.rag_service.retrieve(state["query"], top_k=5)
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
        duration_ms = _duration_ms(started_at)
        self._log_agent_step(
            inquiry_id=state["inquiry"]["id"],
            step_name="rag_search",
            status="ok",
            duration_ms=duration_ms,
            input_payload={"query": state["query"], "top_k": 5},
            output_payload={
                "document_count": len(documents),
                "references": references,
            },
        )

        return {
            **state,
            "documents": documents,
            "context": context,
            "references": references,
        }

    def generate_analysis(self, state: "AgentState") -> "AgentState":
        started_at = time.perf_counter()
        inquiry = state["inquiry"]
        ai_settings = self.ai_settings_service.get()
        analysis_chain = build_analysis_chain(self.llm, ai_settings)

        try:
            analysis = analysis_chain.invoke(
                {
                    "title": inquiry["title"],
                    "body": inquiry["body"],
                    "context": state["context"],
                    "mcp_context": state["mcp_context"],
                }
            )
        except OpenAIError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"OpenAI API request failed: {exc}",
            ) from exc

        analysis = _parse_analysis(analysis)
        analysis["references"] = state["references"]
        duration_ms = _duration_ms(started_at)
        self._log_agent_step(
            inquiry_id=inquiry["id"],
            step_name="generate",
            status="ok",
            duration_ms=duration_ms,
            input_payload={
                "reference_count": len(state["references"]),
                "mcp_result_count": len(state["mcp_results"]),
            },
            output_payload={
                "inquiry_type": analysis["inquiry_type"],
                "urgency": analysis["urgency"],
                "suggested_action": analysis["suggested_action"],
            },
        )

        return {
            **state,
            "analysis": analysis,
        }

    def recommend_docs(self, state: "AgentState") -> "AgentState":
        started_at = time.perf_counter()
        inquiry = state["inquiry"]
        recommendation_chain = build_doc_recommendation_chain(self.llm)

        try:
            result = recommendation_chain.invoke(
                {
                    "title": inquiry["title"],
                    "body": inquiry["body"],
                    "context": state["context"],
                    "analysis": json.dumps(state["analysis"], ensure_ascii=False),
                }
            )
        except OpenAIError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"OpenAI doc recommendation request failed: {exc}",
            ) from exc

        recommendations = _parse_doc_recommendations(result)
        duration_ms = _duration_ms(started_at)
        self._log_agent_step(
            inquiry_id=inquiry["id"],
            step_name="recommend_docs",
            status="ok",
            duration_ms=duration_ms,
            input_payload={
                "reference_count": len(state["references"]),
            },
            output_payload={
                "recommendation_count": len(recommendations),
                "recommendations": recommendations,
            },
        )

        return {
            **state,
            "doc_recommendations": recommendations,
            "analysis": {
                **state["analysis"],
                "doc_recommendations": recommendations,
            },
        }

    def plan_tool_calls(self, state: "AgentState") -> "AgentState":
        if state["tool_loop_complete"]:
            return state

        tool_calls = [
            *state["tool_calls"],
            {
                "name": "github_issue_search",
                "status": "planned",
                "reason": "Check related GitHub Issues before drafting an answer.",
            },
        ]

        return {
            **state,
            "tool_calls": tool_calls,
            "tool_loop_count": state["tool_loop_count"] + 1,
        }

    def inspect_tool_readiness(self, state: "AgentState") -> "AgentState":
        started_at = time.perf_counter()
        tool_calls = [*state["tool_calls"]]
        latest_tool_call = tool_calls[-1]
        github_token_ready = bool(settings.github_token and settings.github_token.strip())
        search_queries = _build_github_issue_search_queries(state["inquiry"])
        mcp_log = self.mcp_service.search_github_issues_log(
            inquiry=state["inquiry"],
            repository=settings.github_repository,
            query=search_queries,
        )
        response_payload = mcp_log.get("response_payload", {})
        issues = response_payload.get("issues", [])
        latest_tool_call["ready"] = github_token_ready
        latest_tool_call["status"] = mcp_log["status"]
        latest_tool_call["message"] = (
            "GitHub Issue search completed."
            if github_token_ready
            else "GITHUB_TOKEN is missing; approval will fail until configured."
        )
        duration_ms = _duration_ms(started_at)
        self._log_agent_step(
            inquiry_id=state["inquiry"]["id"],
            step_name="mcp_github_issue_search",
            status=mcp_log["status"],
            duration_ms=duration_ms,
            input_payload={
                "repository": settings.github_repository,
                "queries": search_queries,
            },
            output_payload={
                "issue_count": len(issues),
                "message": latest_tool_call["message"],
            },
        )

        return {
            **state,
            "tool_calls": tool_calls,
            "mcp_results": issues,
            "mcp_context": _build_mcp_context(response_payload),
            "tool_loop_complete": True,
        }

    def persist_analysis(self, state: "AgentState") -> "AgentState":
        inquiry = state["inquiry"]
        analysis = state["analysis"]
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
            **state,
            "analysis": {
                "inquiry_id": inquiry["id"],
                **analysis,
            },
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
                "references": json.dumps(
                    {
                        "sources": analysis["references"],
                        "doc_recommendations": analysis.get(
                            "doc_recommendations",
                            [],
                        ),
                    },
                    ensure_ascii=False,
                ),
            },
        )
        self.db.commit()

    def _log_agent_step(
        self,
        inquiry_id: int,
        step_name: str,
        status: str,
        duration_ms: int,
        input_payload: dict | None = None,
        output_payload: dict | None = None,
    ) -> None:
        try:
            self.observability_service.log_agent_step(
                inquiry_id=inquiry_id,
                step_name=step_name,
                status=status,
                duration_ms=duration_ms,
                input_payload=input_payload,
                output_payload=output_payload,
            )
        except SQLAlchemyError:
            self.db.rollback()


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


def _parse_doc_recommendations(content: str | dict) -> list[dict[str, str]]:
    if isinstance(content, dict):
        payload = content
    else:
        payload = _loads_analysis(content)

    recommendations = payload.get("recommendations", [])

    if not isinstance(recommendations, list):
        return []

    parsed_recommendations: list[dict[str, str]] = []

    for recommendation in recommendations:
        if isinstance(recommendation, dict):
            file_name = str(recommendation.get("file") or "").strip()
            suggestion = str(recommendation.get("suggestion") or "").strip()
        else:
            file_name = ""
            suggestion = str(recommendation).strip()

        if suggestion and _is_markdown_file_name(file_name):
            parsed_recommendations.append(
                {
                    "file": file_name,
                    "suggestion": suggestion,
                }
            )

    return parsed_recommendations[:3]


def _is_markdown_file_name(file_name: str) -> bool:
    return "/" not in file_name and "\\" not in file_name and file_name.endswith(".md")


def _loads_analysis(content: str) -> dict:
    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"AI response was not valid JSON: {content}",
        ) from exc


def _build_github_issue_search_queries(inquiry: dict) -> list[str]:
    title = _clean_issue_search_text(str(inquiry.get("title") or ""))
    body = _clean_issue_search_text(str(inquiry.get("body") or ""))
    combined = f"{title} {body}"
    queries: list[str] = []

    _append_query(queries, _build_symptom_query(combined))
    _append_query(queries, _compact_query(title))
    _append_query(queries, _compact_query(combined))

    for keyword in _extract_domain_keywords(combined):
        _append_query(queries, keyword)

    return queries[:5] or [title]


def _clean_issue_search_text(text_value: str) -> str:
    return (
        text_value
        .replace("[게시글 AI 검토]", " ")
        .replace("게시판에 등록된 문의성 게시글입니다.", " ")
        .replace("## 게시글", " ")
        .replace("## 댓글 대화", " ")
        .replace("## AI 검토 기준", " ")
        .replace("제목:", " ")
        .replace("작성자:", " ")
        .replace("태그:", " ")
    )


def _compact_query(text_value: str) -> str:
    stopwords = {
        "게시글",
        "문의",
        "내용",
        "작성자",
        "없음",
        "아직",
        "댓글",
        "입니다",
        "합니다",
        "해주세요",
        "확인",
    }
    tokens = [
        token.strip("[](){}#.,:;!?\"'`")
        for token in text_value.split()
    ]
    keywords = [
        token
        for token in tokens
        if len(token) >= 2 and token not in stopwords
    ]

    return " ".join(keywords[:4])


def _build_symptom_query(text_value: str) -> str:
    keyword_groups = [
        ("로딩", ("로딩", "loading")),
        ("멈춤", ("멈", "안넘어", "안 넘어", "멈춰")),
        ("홈화면", ("홈", "홈화면")),
        ("태그", ("태그", "tag")),
        ("저장", ("저장", "등록")),
        ("로그인", ("로그인", "login")),
    ]
    matched_keywords = [
        keyword
        for keyword, aliases in keyword_groups
        if any(alias in text_value for alias in aliases)
    ]

    return " ".join(matched_keywords[:3])


def _extract_domain_keywords(text_value: str) -> list[str]:
    candidates = [
        "로딩",
        "로딩 멈춤",
        "홈화면",
        "태그",
        "태그 등록",
        "로그인",
        "저장",
        "삭제",
    ]

    return [candidate for candidate in candidates if candidate in text_value]


def _append_query(queries: list[str], query: str) -> None:
    cleaned_query = " ".join(query.split())

    if cleaned_query and cleaned_query not in queries:
        queries.append(cleaned_query)


def _build_mcp_context(response_payload: dict) -> str:
    if response_payload.get("status") != "ok":
        return response_payload.get("message") or "GitHub Issue 조회 결과를 사용할 수 없습니다."

    issues = response_payload.get("issues", [])

    if not issues:
        return "관련 GitHub Issue가 없습니다."

    return "\n".join(
        [
            (
                f"- #{issue.get('number')} {issue.get('title')} "
                f"({issue.get('state')}) {issue.get('url')}"
            )
            for issue in issues
        ]
    )


def _duration_ms(started_at: float) -> int:
    return int((time.perf_counter() - started_at) * 1000)
