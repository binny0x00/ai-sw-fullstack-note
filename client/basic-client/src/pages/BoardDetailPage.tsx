/*
* 목록으로 돌아가기 버튼
* 게시물 제목
* 게시물 본문
* 달린 댓글
* 댓글 input
*/
import './css/Board.css'
import {Link, useNavigate, useParams} from "react-router-dom";
import {useEffect, useState} from "react";
import {deletePost, getPost, updatePost, type Post} from "../api.ts";

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
    const {id} = useParams();
    const navigate = useNavigate();

    const [post, setPost] = useState<Post | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        async function fetchPost() {
            if (!id) return;

            try {
                const data = await getPost(Number(id));
                setPost(data);
                setTitle(data?.title ?? '');
                setContent(data?.content ?? '');
            } catch {
                alert('게시글 조회 실패');
            }
        }

        fetchPost();
    }, [id]);

    async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!id || !post) return;

        try {
            await updatePost(Number(id), title, content, post.userId);
            alert('게시글 수정 성공');
            navigate('/board');
        } catch {
            alert('게시글 수정 실패');
        }
    }

    async function handleDelete() {
        if (!id) return;

        try {
            await deletePost(Number(id));
            alert('게시글 삭제 성공');
            navigate('/board');
        } catch {
            alert('게시글 삭제 실패');
        }
    }

    if (!post) {
        return <p>게시글을 불러오는 중입니다.</p>;
    }

    return (
        <>
            <h1>게시물</h1>
            <Link to="/board" className="backButton">목록으로</Link>

            <form className={"boardForm"} onSubmit={handleUpdate}>
                <label className="boardTitle">
                    제목
                    <input value={title} onChange={(e) => setTitle(e.target.value)} />
                </label>

                <label className="boardTitle">
                    내용
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} />
                </label>

                <button type="submit" className="writeButton">수정하기</button>

                <button type="button" className="writeButton" onClick={handleDelete}>삭제하기</button>
            </form>

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