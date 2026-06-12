import './App.css'
import {BrowserRouter, Route, Routes, Navigate} from "react-router-dom";
import HomePage from "./pages/HomePage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import SignupPage from "./pages/SignupPage.tsx";
import BoardPage from "./pages/BoardPage.tsx";
import BoardDetailPage from "./pages/BoardDetailPage.tsx";


function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />}/>
                <Route path="/login" element={<LoginPage/>}/>
                <Route path="/signup" element={<SignupPage/>}/>
                <Route path="/home" element={<HomePage/>}/>
                <Route path="/board" element={<BoardPage/>}/>
                <Route path="/board/:id" element={<BoardDetailPage/>}/>
            </Routes>
        </BrowserRouter>
    );
}

export default App
