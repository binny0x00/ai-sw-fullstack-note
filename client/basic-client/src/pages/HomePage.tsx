/*
* 메뉴 - 홈, 게시판
*/
import {Link} from "react-router-dom";

function HomePage() {
    return (
        <>
            <h1>홈</h1>
            <nav>
                <ul>
                    <li>
                        <Link to="/board">게시판</Link>
                    </li>
                    <li>
                        <Link to="/login">로그아웃</Link>
                    </li>
                </ul>
            </nav>
        </>
    );
}

export default HomePage;
