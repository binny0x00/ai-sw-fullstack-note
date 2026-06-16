/*
* 메뉴 - 홈, 게시판
*/
import {Link} from "react-router-dom";
import {getCurrentUserRole} from "../api.ts";

function HomePage() {
    const isManager = getCurrentUserRole() === 'MANAGER';

    return (
        <>
            <h1>홈</h1>
            <nav>
                <ul>
                    <li>
                        <Link to="/board">게시판</Link>
                    </li>
                    {isManager && (
                        <li>
                            <Link to="/admin/ai">AI 운영 관리</Link>
                        </li>
                    )}
                    <li>
                        <Link to="/login">로그아웃</Link>
                    </li>
                </ul>
            </nav>
        </>
    );
}

export default HomePage;
