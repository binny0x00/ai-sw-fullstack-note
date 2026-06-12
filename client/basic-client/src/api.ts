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