import './App.css'
import {useState} from 'react'
import LoginForm from "./component/LoginForm.tsx";
import SignupForm from "./component/SignupForm.tsx";

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isSignupOpen, setIsSignupOpen] = useState(false);
    const [isSignup, setIsSignup] = useState(false);

    return (
        <>
            <LoginForm isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn}/>
            <div style={{display: 'flex', justifyContent: 'center', margin: '10px'}}>
                {!isLoggedIn && <button onClick={() => setIsSignupOpen(prevState => !prevState)} style={{
                    maxWidth: '180px',
                    verticalAlign: "center"
                }}>{isSignupOpen ? "회원가입 닫기" : "회원가입 열기"}</button>}
            </div>
            {isSignupOpen && !isLoggedIn && <SignupForm isSignup={isSignup} setIsSignup={setIsSignup} setIsSignupOpen={setIsSignupOpen}/>}
        </>
    );
}

export default App
