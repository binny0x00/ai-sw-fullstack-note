/*
* 로그인 제목
* 이메일/비밀번호 input
* 로그인 버튼
* 회원가입 페이지 링크
*/

import {useState} from "react";
import {login} from "../api.ts";
import {Link, useNavigate} from "react-router-dom";

function LoginPage() {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        try {
            await login(email, password);
            alert("로그인 성공");
            navigate("/home");
        } catch{
            alert('로그인 실패');
        }
    }

    return (
        <>
            <h1>로그인</h1>
            <form onSubmit={handleSubmit}>
                <input type = 'email'
                       value={email}
                       placeholder='이메일'
                       onChange={(e) => setEmail(e.target.value)}/>

                <input type = 'password'
                       value={password}
                       placeholder='비밀번호'
                       onChange={(e) => setPassword(e.target.value)}/>

                <button type="submit">로그인</button>
            </form>
            <Link to="/signup">회원가입</Link>
        </>
    );
}

export default LoginPage;