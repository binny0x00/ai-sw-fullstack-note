import './App.css'
import {BrowserRouter, Route, Routes, Navigate, useLocation, useNavigate} from "react-router-dom";
import HomePage from "./pages/HomePage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import SignupPage from "./pages/SignupPage.tsx";
import BoardPage from "./pages/BoardPage.tsx";
import BoardDetailPage from "./pages/BoardDetailPage.tsx";
import BoardWritePage from "./pages/BoardWritePage.tsx";
import AiAdminPage from "./pages/AiAdminPage.tsx";
import DocEditorPage from "./pages/DocEditorPage.tsx";
import {getCurrentUserNickname, getCurrentUserRole, logout} from "./api.ts";


function App() {
    return (
        <BrowserRouter>
            <CurrentUserBar />
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace/>}/>
                <Route path="/login" element={<LoginPage/>}/>
                <Route path="/signup" element={<SignupPage/>}/>
                <Route path="/home" element={<HomePage/>}/>
                <Route path="/board" element={<BoardPage/>}/>
                <Route path="/board/write" element={<BoardWritePage/>}/>
                <Route path="/board/:id" element={<BoardDetailPage/>}/>
                <Route path="/admin/ai" element={<AiAdminPage/>}/>
                <Route path="/admin/docs/:fileName" element={<DocEditorPage/>}/>
            </Routes>
        </BrowserRouter>
    );
}

function CurrentUserBar() {
    useLocation();
    const navigate = useNavigate();

    const nickname = getCurrentUserNickname();
    const role = getCurrentUserRole();

    function handleLogout() {
        logout();
        navigate('/login', {replace: true});
    }

    return (
        <header className="currentUserBar">
            {nickname ? (
                <>
                    <span>
                        로그인 사용자: <strong>{nickname}</strong>
                        <small>{role}</small>
                    </span>
                    <button type="button" onClick={handleLogout}>로그아웃</button>
                </>
            ) : (
                <span>로그인 사용자: 없음</span>
            )}
        </header>
    );
}

export default App
