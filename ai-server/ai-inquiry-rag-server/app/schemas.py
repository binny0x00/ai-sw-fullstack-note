from pydantic import BaseModel, EmailStr, Field


class InquiryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)
    customer_email: EmailStr | None = None
    post_id: int | None = None


class InquiryRead(BaseModel):
    id: int
    post_id: int | None
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


class RagStatusResponse(BaseModel):
    collection_name: str
    document_count: int
    embedding_count: int
    ready: bool


class RagPostIndexRequest(BaseModel):
    id: int
    title: str = Field(min_length=1)
    content: str = Field(min_length=1)
    author: str | None = None
    tags: list[str] = []


class RagPostIndexResponse(BaseModel):
    source: str
    chunk_count: int
    indexed: bool


class PostPrecheckRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    tag_names: list[str] = []


class PostPrecheckResponse(BaseModel):
    needs_more_info: bool
    questions: list[str]
    suggested_content: str | None = None
    reason: str
    category: str | None = None
    references: list[str]


class AnalysisResponse(BaseModel):
    inquiry_id: int
    inquiry_type: str
    urgency: str
    answer_draft: str
    suggested_action: str
    references: list[str]


class GitHubIssueApprovalRequest(BaseModel):
    approved: bool
    action: str = Field(default="create", pattern="^(create|comment)$")
    issue_number: int | None = Field(default=None, ge=1)
    repository: str = Field(
        default="binny0x00/ai-sw-fullstack-note",
        description="GitHub repository in owner/name format.",
    )


class AiSettingsRead(BaseModel):
    answer_tone: str
    technical_issue_policy: str
    escalation_policy: str
    custom_instructions: str


class AiSettingsUpdate(BaseModel):
    answer_tone: str = Field(min_length=1)
    technical_issue_policy: str = Field(min_length=1)
    escalation_policy: str = Field(min_length=1)
    custom_instructions: str = ""


class DocRecommendationApplyRequest(BaseModel):
    file: str = Field(min_length=1)
    suggestion: str = Field(min_length=1)


class DocRecommendationApplyResponse(BaseModel):
    file: str
    applied: bool
    appended_text: str
    index_result: dict | None = None


class MarkdownDocRead(BaseModel):
    file: str
    content: str


class MarkdownDocUpdate(BaseModel):
    content: str


class MarkdownDocUpdateResponse(BaseModel):
    file: str
    content: str
    updated: bool
    index_result: dict | None = None


class ObservabilitySummary(BaseModel):
    api: dict
    agent: dict
    mcp: dict
    recent_steps: list[dict]
