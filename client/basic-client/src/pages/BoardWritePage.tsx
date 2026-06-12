/*
* 목록으로 돌아가기 버튼
* 게시물 제목 입력
* 게시물 본문 입력
* 저장 버튼
*/
import './css/Board.css'
import {Link} from "react-router-dom";

function BoardWritePage() {
    return (
        <>
            <h1>게시물 작성</h1>
            <Link to="/board" className="backButton">목록으로</Link>

            <form className={"boardForm"}>
                <label className="boardTitle">
                    제목
                    <input
                        type="text"
                        placeholder={"제목을 입력하세요."}
                    />
                </label>

                <label className="boardTitle">
                    내용
                    <textarea
                        placeholder={"내용을 입력하세요."}
                    />
                </label>

                <button type="submit" className={"writeButton"}>제출하기</button>
            </form>
        </>
    );
}

export default BoardWritePage;