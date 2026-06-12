/*
* 회원가입 제목
* 닉네임/이메일/비밀번호 input
* 회원가입 버튼
* 로그인 페이지 링크
*/

import {useState} from "react";
import {signup} from "../api.ts";
import {Link, useNavigate} from "react-router-dom";

function SignupPage() {
    const navigate = useNavigate();

    const [nickName, setNickName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');


    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        try {
            await signup(nickName, email, password);
            alert('회원가입 성공');
            navigate('/login');
        } catch{
            alert('회원가입 실패');
        }
    }

    return (
        <>
            <h1>회원가입</h1>
            <form onSubmit={handleSubmit}>
                <input type = 'nickName'
                       value={nickName}
                       placeholder='닉네임'
                       onChange={(e) => setNickName(e.target.value)}/>

                <input type = 'email'
                       value={email}
                       placeholder='이메일'
                       onChange={(e) => setEmail(e.target.value)}/>

                <input type = 'password'
                       value={password}
                       placeholder='비밀번호'
                       onChange={(e) => setPassword(e.target.value)}/>

                <button type="submit">회원가입</button>
            </form>
            <Link to="/login">로그인</Link>
        </>
    );
}

export default SignupPage;