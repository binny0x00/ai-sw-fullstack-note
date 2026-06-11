import {useState} from "react";

function SignupForm() {
    const [nickName, setNickName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        // todo: signup api 연동
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