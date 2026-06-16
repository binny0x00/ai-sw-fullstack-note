const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type UserRole = 'USER' | 'MANAGER';

export function getCurrentUserRole(): UserRole {
    return (localStorage.getItem('userRole') as UserRole | null) ?? 'USER';
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
    recommendedAnswer: string;
    shouldCreateIssue: boolean;
};

export async function reviewPostWithAi(
    postId: number,
    autoCreateIssue = true,
    repository = 'binny0x00/ai-sw-fullstack-note',
): Promise<PostAiReview> {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/ai-review`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
        },
        body: JSON.stringify({autoCreateIssue, repository}),
    });

    if (!response.ok) {
        throw new Error('게시글 AI 검토 실패');
    }

    return response.json();
}
