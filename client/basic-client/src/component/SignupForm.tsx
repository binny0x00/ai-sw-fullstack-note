import {useState} from "react";
import {signup} from "../api.ts";

type SignUpFormProps = {
    isSignup:boolean, setIsSignup:React.Dispatch<React.SetStateAction<boolean>>, setIsSignupOpen:React.Dispatch<React.SetStateAction<boolean>>
}

function SignupForm({isSignup, setIsSignup, setIsSignupOpen}:SignUpFormProps) {
    const [nickName, setNickName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        try {
            await signup(nickName, email, password);
            setIsSignup(true);
            alert('회원가입 성공');
            setNickName('');
            setEmail('');
            setPassword('');
            setIsSignupOpen(false);
        } catch{
            alert('회원가입 실패');
        }
    }

    return(
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
        </>
    );
}

export default SignupForm;