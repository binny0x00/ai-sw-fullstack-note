const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type UserRole = 'USER' | 'MANAGER';

export function getCurrentUserRole(): UserRole {
    return (localStorage.getItem('userRole') as UserRole | null) ?? 'USER';
}

export function getCurrentUserNickname(): string | null {
    return localStorage.getItem('userNickname');
}

export function getCurrentUserId(): number | null {
    const storedUserId = localStorage.getItem('userId');
    const userId = Number(storedUserId);

    return storedUserId === null || Number.isNaN(userId) ? null : userId;
}

export function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userNickname');
    localStorage.removeItem('userRole');
}

function getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('accessToken');

    return token ?
        {Authorization: `Bearer ${token}`}
        : {};
}

export async function login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            password,
        }),
    });
    if (!response.ok) {
        throw new Error('로그인 실패');
    }

    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('userId', String(data.user.id));
    localStorage.setItem('userNickname', data.user.nickname);
    localStorage.setItem('userRole', data.user.role);

    return data;
}

export async function signup(nickname: string, email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            nickname,
            email,
            password,
        }),
    });
    if (!response.ok) {
        throw new Error('회원가입 실패');
    }
}

export type Post = {
    id: number;
    title: string;
    content: string;
    userId: number;
    createdAt: string;
    updatedAt: string;
    user?: {
        id: number;
        nickname: string;
        email: string;
    }
    tags?: Tag[];
}

export type Tag = {
    id: number;
    name: string;
    createdAt: string;
    updatedAt: string;
};

export type PostListResponse = {
    items: Post[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

export type Comment = {
    id: number;
    content: string;
    postId: number;
    userId: number;
    createdAt: string;
    updatedAt: string;
    user?: {
        id: number;
        nickname: string;
        email: string;
    };
};

export type PostPrecheckResult = {
    needsMoreInfo: boolean;
    questions: string[];
    suggestedContent?: string | null;
    reason: string;
    category?: string | null;
    references: string[];
};

export async function createPost(title: string, content: string, tagNames: string[] = []) {
    const response = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
        },
        body: JSON.stringify({title, content, tagNames}),
    });

    if (!response.ok) {
        throw new Error('게시글 작성 실패');
    }

    return response.json();
}

export async function precheckPost(
    title: string,
    content: string,
    tagNames: string[] = [],
): Promise<PostPrecheckResult> {
    const response = await fetch(`${API_BASE_URL}/posts/ai-precheck`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
        },
        body: JSON.stringify({title, content, tagNames}),
    });

    if (!response.ok) {
        throw new Error('게시글 AI 점검 실패');
    }

    return response.json();
}

export async function getPosts(page = 1, limit = 10, keyword = ''): Promise<PostListResponse> {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });

    if (keyword.trim()) {
        params.set('keyword', keyword.trim());
    }
    const response = await fetch(`${API_BASE_URL}/posts?${params.toString()}`);

    if (!response.ok) {
        throw new Error('게시글 목록 조회 실패');
    }

    return response.json();
}

export async function getPost(id: number): Promise<Post | null> {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`);

    if (!response.ok) {
        throw new Error('게시글 조회 실패');
    }

    return response.json();
}

export async function updatePost(
    id: number,
    title: string,
    content: string,
    tagNames: string[] = [],
) {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
        },
        body: JSON.stringify({title, content, tagNames}),
    });

    if (!response.ok) {
        throw new Error('게시글 수정 실패');
    }

    return response.json();
}

export async function deletePost(id: number) {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
        method: 'DELETE',
        headers: {
            ...getAuthHeader(),
        }
    });

    if (!response.ok) {
        throw new Error('게시글 삭제 실패');
    }

    return response.json();
}

export async function getComments(postId: number): Promise<Comment[]> {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`);

    if (!response.ok) {
        throw new Error('댓글 목록 조회 실패');
    }

    return response.json();
}

export async function createComment(postId: number, content: string) {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
        },
        body: JSON.stringify({content}),
    });

    if (!response.ok) {
        throw new Error('댓글 작성 실패');
    }

    return response.json();
}

export async function deleteComment(id: number) {
    const response = await fetch(`${API_BASE_URL}/posts/comments/${id}`, {
        method: 'DELETE',
        headers: {
            ...getAuthHeader(),
        }
    });
    if (!response.ok) {
        throw new Error('댓글 삭제 실패');
    }
    return response.json();
}

export type Inquiry = {
    id: number;
    title: string;
    body: string;
    customerEmail?: string;
    status: string;
    inquiryType?: string;
    urgency?: string;
    aiSummary?: string;
    suggestedAction?: string;
    createdAt: string;
    updatedAt: string;
    analysisResults?: AiAnalysisResult[];
    mcpExecutionLogs?: McpExecutionLog[];
};

export type AiAnalysisResult = {
    id: number;
    inquiryId: number;
    inquiryType: string;
    urgency: string;
    answerDraft: string;
    suggestedAction: string;
    references: string[];
    createdAt: string;
};

export type McpExecutionLog = {
    id: number;
    inquiryId: number;
    toolName: string;
    status: string;
    requestPayload: Record<string, unknown>;
    responsePayload: Record<string, unknown>;
    createdAt: string;
};

export type PostAiReview = {
    inquiry: Inquiry;
    analysis: AiAnalysisResult;
    githubIssueLog: McpExecutionLog | null;
    mcpSearchLogs?: McpExecutionLog[];
    docRecommendations?: DocRecommendation[];
    recommendedAnswer: string;
    shouldCreateIssue: boolean;
    repository?: string;
    sourcePost?: {
        id: number;
        title: string;
        content: string;
        author: string;
        tags: string[];
        commentCount: number;
    };
};

export type DocRecommendation = {
    file: string;
    suggestion: string;
};

export type DocRecommendationApplyResult = {
    file: string;
    applied: boolean;
    appended_text?: string;
    index_result?: RagIndexResult | null;
};

export async function applyDocRecommendation(
    recommendation: DocRecommendation,
): Promise<DocRecommendationApplyResult> {
    const response = await fetch(`${API_BASE_URL}/inquiries/doc-recommendations/apply`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
        },
        body: JSON.stringify(recommendation),
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, '문서 보강 반영 실패'));
    }

    return response.json();
}

export type RagIndexResult = {
    source: string;
    chunk_count?: number;
    chunkCount?: number;
    indexed: boolean;
};

export type MarkdownDoc = {
    file: string;
    content: string;
    updated?: boolean;
    index_result?: RagIndexResult | null;
};

export async function getMarkdownDoc(fileName: string): Promise<MarkdownDoc> {
    const response = await fetch(
        `${API_BASE_URL}/inquiries/docs/${encodeURIComponent(fileName)}`,
        {
            headers: {
                ...getAuthHeader(),
            },
        },
    );

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, '문서 조회 실패'));
    }

    return response.json();
}

export async function updateMarkdownDoc(fileName: string, content: string): Promise<MarkdownDoc> {
    const response = await fetch(
        `${API_BASE_URL}/inquiries/docs/${encodeURIComponent(fileName)}`,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader(),
            },
            body: JSON.stringify({content}),
        },
    );

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, '문서 저장 실패'));
    }

    return response.json();
}

export async function reviewPostWithAi(
    postId: number,
    repository = 'binny0x00/ai-sw-fullstack-note',
): Promise<PostAiReview> {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/ai-review`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
        },
        body: JSON.stringify({repository}),
    });

    if (!response.ok) {
        throw new Error('게시글 AI 검토 실패');
    }

    return response.json();
}

export async function getLatestPostAiReview(postId: number): Promise<PostAiReview | null> {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/ai-review/latest`, {
        headers: {
            ...getAuthHeader(),
        },
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, '최근 AI 검토 조회 실패'));
    }

    return response.json();
}

export async function approveGithubIssue(
    inquiryId: number,
    repository = 'binny0x00/ai-sw-fullstack-note',
    options: {
        action?: 'create' | 'comment';
        issueNumber?: number;
    } = {},
): Promise<McpExecutionLog> {
    const response = await fetch(`${API_BASE_URL}/inquiries/${inquiryId}/github-issue`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
        },
        body: JSON.stringify({
            approved: true,
            repository,
            action: options.action ?? 'create',
            issueNumber: options.issueNumber,
        }),
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'GitHub Issue 등록 실패'));
    }

    return response.json();
}

export type AiSettings = {
    answerTone: string;
    technicalIssuePolicy: string;
    escalationPolicy: string;
    customInstructions: string;
};

export type RagStatus = {
    collectionName: string;
    documentCount: number;
    embeddingCount: number;
    ready: boolean;
};

export type ObservabilitySummary = {
    api: {
        requestCount: number;
        averageDurationMs: number;
        failureRate: number;
    };
    agent: {
        stepCount: number;
        averageStepDurationMs: number;
        averageLlmDurationMs: number;
    };
    mcp: {
        callCount: number;
        failureRate: number;
    };
    recentSteps: Array<{
        inquiryId?: number;
        stepName: string;
        status: string;
        durationMs: number;
        outputPayload: Record<string, unknown>;
        createdAt: string;
    }>;
};

export async function getRagStatus(): Promise<RagStatus> {
    const response = await fetch(`${API_BASE_URL}/inquiries/rag-status`, {
        headers: {
            ...getAuthHeader(),
        },
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'RAG 상태 조회 실패'));
    }

    return mapRagStatus(await response.json());
}

export async function getObservabilitySummary(): Promise<ObservabilitySummary> {
    const response = await fetch(`${API_BASE_URL}/inquiries/observability`, {
        headers: {
            ...getAuthHeader(),
        },
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, '모니터링 요약 조회 실패'));
    }

    return mapObservabilitySummary(await response.json());
}

export async function getAiSettings(): Promise<AiSettings> {
    const response = await fetch(`${API_BASE_URL}/inquiries/ai-settings`, {
        headers: {
            ...getAuthHeader(),
        },
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'AI 설정 조회 실패'));
    }

    return response.json();
}

export async function updateAiSettings(aiSettings: AiSettings): Promise<AiSettings> {
    const response = await fetch(`${API_BASE_URL}/inquiries/ai-settings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
        },
        body: JSON.stringify(aiSettings),
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'AI 설정 저장 실패'));
    }

    return response.json();
}

async function readErrorMessage(response: Response, fallback: string) {
    const message = await response.text();

    return message ? `${fallback}: ${message}` : fallback;
}

function mapRagStatus(data: Record<string, unknown>): RagStatus {
    return {
        collectionName: String(data.collectionName ?? data.collection_name ?? ''),
        documentCount: Number(data.documentCount ?? data.document_count ?? 0),
        embeddingCount: Number(data.embeddingCount ?? data.embedding_count ?? 0),
        ready: Boolean(data.ready),
    };
}

function mapObservabilitySummary(data: Record<string, unknown>): ObservabilitySummary {
    const api = asRecord(data.api);
    const agent = asRecord(data.agent);
    const mcp = asRecord(data.mcp);
    const recentSteps = Array.isArray(data.recent_steps)
        ? data.recent_steps
        : Array.isArray(data.recentSteps) ? data.recentSteps : [];

    return {
        api: {
            requestCount: Number(api.request_count ?? api.requestCount ?? 0),
            averageDurationMs: Number(api.average_duration_ms ?? api.averageDurationMs ?? 0),
            failureRate: Number(api.failure_rate ?? api.failureRate ?? 0),
        },
        agent: {
            stepCount: Number(agent.step_count ?? agent.stepCount ?? 0),
            averageStepDurationMs:
                Number(agent.average_step_duration_ms ?? agent.averageStepDurationMs ?? 0),
            averageLlmDurationMs:
                Number(agent.average_llm_duration_ms ?? agent.averageLlmDurationMs ?? 0),
        },
        mcp: {
            callCount: Number(mcp.call_count ?? mcp.callCount ?? 0),
            failureRate: Number(mcp.failure_rate ?? mcp.failureRate ?? 0),
        },
        recentSteps: recentSteps.map((step) => {
            const row = asRecord(step);

            return {
                inquiryId: row.inquiry_id !== undefined || row.inquiryId !== undefined
                    ? Number(row.inquiry_id ?? row.inquiryId)
                    : undefined,
                stepName: String(row.step_name ?? row.stepName ?? ''),
                status: String(row.status ?? ''),
                durationMs: Number(row.duration_ms ?? row.durationMs ?? 0),
                outputPayload: asRecord(row.output_payload ?? row.outputPayload),
                createdAt: String(row.created_at ?? row.createdAt ?? ''),
            };
        }),
    };
}

function asRecord(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === 'object'
        ? value as Record<string, unknown>
        : {};
}
