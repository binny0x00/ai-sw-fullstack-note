import {useState} from "react";
import {login} from "../api.ts";

// React 컴포넌트는 JSX에서 넘긴 값들을 하나의 props 객체로 받음
type LoginFormProps = {
    isLoggedIn:boolean, setIsLoggedIn:React.Dispatch<React.SetStateAction<boolean>>
}

function LoginForm({isLoggedIn, setIsLoggedIn}: LoginFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        try {
            await login(email, password);
            setIsLoggedIn(true);
        } catch{
            alert('로그인 실패');
        }
    }

    function handleLogout(){
        setIsLoggedIn(false);
        setEmail('');
        setPassword('');
    }

    return (
        <>
            <h1>로그인</h1>
            {
                isLoggedIn ?
                    <div style={{display: 'flex', justifyContent: 'center', margin: '10px'}}>
                        <button type="submit" onClick={handleLogout}>로그아웃</button>
                    </div>

                    : <form onSubmit={handleSubmit}>
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
            }
        </>
    );
}

export default LoginForm;