/*
* 목록으로 돌아가기 버튼
* 게시물 제목
* 게시물 본문
* 달린 댓글
* 댓글 input
*/
import './css/Board.css'
import {Link} from "react-router-dom";

type Comment = {
    id: number,
    author: string,
    body: string,
}

const comments: Comment[] = [
    {
        id: 1,
        author: "owner",
        body: "흥미로운 글이네요.",
    }
]

function BoardDetailPage() {
    return (
        <>
            <h1>게시물</h1>
            <Link to="/board" className="backButton">목록으로</Link>

            <>
                <label className="boardTitle">
                    제목
                    <text>(제목)</text>
                </label>

                <label className="boardTitle">
                    내용
                    <text>(제목)</text>
                </label>
            </>

            <table className="boardTable">
                <thead>
                <tr>
                    <th>번호</th>
                    <th>작성자</th>
                    <th>댓글 내용</th>
                </tr>
                </thead>

                <tbody>
                {comments.map((comment: Comment) => (
                    <tr key={comment.id}>
                        <td>{comment.id}</td>
                        <td>{comment.author}</td>
                        <td>{comment.body}</td>
                    </tr>
                ))}
                </tbody>
            </table>

            <form className={"boardForm"}>
                <textarea
                    placeholder={"댓글을 입력하세요."}
                />
                <button type="submit" className={"writeButton"}>등록하기</button>
            </form>
        </>
    );
}

export default BoardDetailPage;