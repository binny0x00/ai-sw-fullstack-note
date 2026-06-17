import time

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal, get_db
from app.rag.service import RagService
from app.schemas import (
    AiSettingsRead,
    AiSettingsUpdate,
    AnalysisResponse,
    DocRecommendationApplyRequest,
    DocRecommendationApplyResponse,
    GitHubIssueApprovalRequest,
    InquiryCreate,
    InquiryRead,
    MarkdownDocRead,
    MarkdownDocUpdate,
    MarkdownDocUpdateResponse,
    ObservabilitySummary,
    PostPrecheckRequest,
    PostPrecheckResponse,
    RagPostIndexRequest,
    RagPostIndexResponse,
    RagSearchRequest,
    RagSearchResponse,
    RagStatusResponse,
)
from app.services.ai_settings_service import AiSettingsService
from app.services.agent_service import AgentService
from app.services.doc_recommendation_service import DocRecommendationService
from app.services.inquiry_service import InquiryService
from app.services.mcp_service import McpService
from app.services.observability_service import ObservabilityService
from app.services.post_precheck_service import PostPrecheckService


app = FastAPI(title=settings.app_name)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "docs": "/docs",
        "health": "/health",
    }


@app.middleware("http")
async def log_api_request(request: Request, call_next) -> Response:
    started_at = time.perf_counter()
    status_code = 500

    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        duration_ms = int((time.perf_counter() - started_at) * 1000)

        if request.url.path != "/health":
            _safe_log_api_request(
                method=request.method,
                path=request.url.path,
                status_code=status_code,
                duration_ms=duration_ms,
            )


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/inquiries", response_model=InquiryRead)
def create_inquiry(
    request: InquiryCreate,
    db: Session = Depends(get_db),
) -> dict:
    return InquiryService(db).create(request)


@app.get("/inquiries", response_model=list[InquiryRead])
def list_inquiries(db: Session = Depends(get_db)) -> list[dict]:
    return InquiryService(db).list_all()


@app.get("/inquiries/{inquiry_id}", response_model=InquiryRead)
def get_inquiry(
    inquiry_id: int,
    db: Session = Depends(get_db),
) -> dict:
    inquiry = InquiryService(db).get(inquiry_id)

    if inquiry is None:
        raise HTTPException(status_code=404, detail="Inquiry not found.")

    return inquiry


@app.post("/rag/search", response_model=RagSearchResponse)
def search_rag(
    request: RagSearchRequest,
    db: Session = Depends(get_db),
) -> dict:
    results = RagService(db).search(request.query, request.top_k)

    return {
        "query": request.query,
        "results": results,
    }


@app.get("/rag/status", response_model=RagStatusResponse)
def get_rag_status(db: Session = Depends(get_db)) -> dict:
    return RagService(db).get_status()


@app.post("/admin/rag/ingest")
def ingest_rag_documents(
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    if not settings.admin_ingest_token:
        raise HTTPException(
            status_code=403,
            detail="ADMIN_INGEST_TOKEN is not configured.",
        )

    if x_admin_token != settings.admin_ingest_token:
        raise HTTPException(status_code=403, detail="Invalid admin token.")

    return RagService(db).index_all_markdown_documents()


@app.post("/rag/posts", response_model=RagPostIndexResponse)
def index_post_for_rag(
    request: RagPostIndexRequest,
    db: Session = Depends(get_db),
) -> dict:
    return RagService(db).index_post(request.model_dump())


@app.post("/posts/precheck", response_model=PostPrecheckResponse)
def precheck_post(
    request: PostPrecheckRequest,
    db: Session = Depends(get_db),
) -> dict:
    return PostPrecheckService(db).check(request)


@app.delete("/rag/posts/{post_id}")
def delete_post_from_rag(
    post_id: int,
    db: Session = Depends(get_db),
) -> dict:
    return RagService(db).delete_post(post_id)


@app.get("/admin/ai-settings", response_model=AiSettingsRead)
def get_ai_settings(db: Session = Depends(get_db)) -> dict:
    return AiSettingsService(db).get()


@app.get("/admin/observability", response_model=ObservabilitySummary)
def get_observability_summary(db: Session = Depends(get_db)) -> dict:
    return ObservabilityService(db).get_summary()


@app.post(
    "/admin/docs/recommendations/apply",
    response_model=DocRecommendationApplyResponse,
)
def apply_doc_recommendation(
    request: DocRecommendationApplyRequest,
    db: Session = Depends(get_db),
) -> dict:
    return DocRecommendationService(db).apply(
        file_name=request.file,
        suggestion=request.suggestion,
    )


@app.get("/admin/docs/{file_name}", response_model=MarkdownDocRead)
def read_markdown_doc(file_name: str) -> dict:
    return DocRecommendationService().read(file_name)


@app.put("/admin/docs/{file_name}", response_model=MarkdownDocUpdateResponse)
def update_markdown_doc(
    file_name: str,
    request: MarkdownDocUpdate,
    db: Session = Depends(get_db),
) -> dict:
    return DocRecommendationService(db).update(
        file_name=file_name,
        content=request.content,
    )


@app.put("/admin/ai-settings", response_model=AiSettingsRead)
def update_ai_settings(
    request: AiSettingsUpdate,
    db: Session = Depends(get_db),
) -> dict:
    return AiSettingsService(db).update(request)


@app.post("/inquiries/{inquiry_id}/analyze", response_model=AnalysisResponse)
def analyze_inquiry(
    inquiry_id: int,
    db: Session = Depends(get_db),
) -> dict:
    inquiry = InquiryService(db).get(inquiry_id)

    if inquiry is None:
        raise HTTPException(status_code=404, detail="Inquiry not found.")

    return AgentService(db).analyze(inquiry)


@app.post("/inquiries/{inquiry_id}/github-issue")
def approve_github_issue(
    inquiry_id: int,
    request: GitHubIssueApprovalRequest,
    db: Session = Depends(get_db),
) -> dict:
    inquiry = InquiryService(db).get(inquiry_id)

    if inquiry is None:
        raise HTTPException(status_code=404, detail="Inquiry not found.")

    return McpService(db).create_github_issue_log(
        inquiry=inquiry,
        approved=request.approved,
        repository=request.repository,
        action=request.action,
        issue_number=request.issue_number,
    )


def _safe_log_api_request(
    method: str,
    path: str,
    status_code: int,
    duration_ms: int,
) -> None:
    db = SessionLocal()
    try:
        ObservabilityService(db).log_api_request(
            method=method,
            path=path,
            status_code=status_code,
            duration_ms=duration_ms,
        )
    except SQLAlchemyError:
        db.rollback()
    finally:
        db.close()
