from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.rag.service import RagService
from app.schemas import (
    AnalysisResponse,
    GitHubIssueApprovalRequest,
    InquiryCreate,
    InquiryRead,
    RagSearchRequest,
    RagSearchResponse,
)
from app.services.agent_service import AgentService
from app.services.inquiry_service import InquiryService
from app.services.mcp_service import McpService


app = FastAPI(title=settings.app_name)


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
    )

