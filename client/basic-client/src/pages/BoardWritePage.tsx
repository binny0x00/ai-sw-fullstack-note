/*
* 목록으로 돌아가기 버튼
* 게시물 제목 입력
* 게시물 본문 입력
* 저장 버튼
*/
import './css/Board.css'
import {Link, useNavigate} from "react-router-dom";
import {useState} from "react";
import {createPost} from '../api';

function BoardWritePage() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        try {
            await createPost(title, content, 1);
            alert('게시글 작성 성공');
            navigate('/board');
        } catch {
            alert('게시글 작성 실패');
        }
    }

    return (
        <>
            <h1>게시물 작성</h1>
            <Link to="/board" className="backButton">목록으로</Link>

            <form className={"boardForm"} onSubmit={handleSubmit}>
                <label className="boardTitle">
                    제목
                    <input
                        type="text"
                        value={title}
                        placeholder={"제목을 입력하세요."}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </label>

                <label className="boardTitle">
                    내용
                    <textarea
                        value={content}
                        placeholder={"내용을 입력하세요."}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </label>

                <button type="submit" className={"writeButton"}>제출하기</button>
            </form>
        </>
    );
}

export default BoardWritePage;