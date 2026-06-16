from pydantic import BaseModel, EmailStr, Field


class InquiryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)
    customer_email: EmailStr | None = None


class InquiryRead(BaseModel):
    id: int
    title: str
    body: str
    customer_email: str | None
    status: str
    inquiry_type: str | None
    urgency: str | None
    ai_summary: str | None
    suggested_action: str | None


class RagSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=10)


class RagSearchResult(BaseModel):
    content: str
    source: str
    title: str
    category: str
    distance: float


class RagSearchResponse(BaseModel):
    query: str
    results: list[RagSearchResult]


class AnalysisResponse(BaseModel):
    inquiry_id: int
    inquiry_type: str
    urgency: str
    answer_draft: str
    suggested_action: str
    references: list[str]


class GitHubIssueApprovalRequest(BaseModel):
    approved: bool
    repository: str = Field(
        default="owner/repository",
        description="GitHub repository in owner/name format.",
    )

