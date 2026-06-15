const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
}

export type PostListResponse = {
    items: Post[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

export async function createPost(title: string, content: string, userId: number) {
    const response = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({title, content, userId}),
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
    userId: number,
) {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({title, content, userId}),
    });

    if (!response.ok) {
        throw new Error('게시글 수정 실패');
    }

    return response.json();
}

export async function deletePost(id: number) {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('게시글 삭제 실패');
    }

    return response.json();
}