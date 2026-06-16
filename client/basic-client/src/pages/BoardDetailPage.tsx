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
import {
    createComment,
    deletePost,
    getComments,
    getCurrentUserRole,
    getPost,
    reviewPostWithAi,
    updatePost,
    type Comment,
    type Post,
    type PostAiReview,
    deleteComment
} from "../api.ts";

function BoardDetailPage() {
    const {id} = useParams();
    const navigate = useNavigate();

    const [post, setPost] = useState<Post | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentContent, setCommentContent] = useState('');
    const [aiReview, setAiReview] = useState<PostAiReview | null>(null);
    const [isReviewing, setIsReviewing] = useState(false);
    const isManager = getCurrentUserRole() === 'MANAGER';

    useEffect(() => {
        async function fetchPost() {
            if (!id) return;

            try {
                const postData = await getPost(Number(id));
                const commentData = await getComments(Number(id));

                setPost(postData);
                setTitle(postData?.title ?? '');
                setContent(postData?.content ?? '');
                setTags(postData?.tags?.map((tag) => tag.name).join(', ') ?? '');
                setComments(commentData);
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
            const tagNames = tags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean);

            await updatePost(Number(id), title, content, tagNames);
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

    async function handleCreateComment(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!id || !commentContent.trim()) return;

        try {
            await createComment(Number(id), commentContent);
            const commentData = await getComments(Number(id));
            setComments(commentData);
            setCommentContent('');
        } catch {
            alert('댓글 작성 실패');
        }
    }

    async function handleDeleteComment(commentId: number){
        if (!id) return;

        try {
            await deleteComment(commentId);
            const commentData = await getComments(Number(id));
            setComments(commentData);
        } catch {
            alert('댓글 삭제 실패');
        }
    }

    async function handleAiReview() {
        if (!id) return;

        setIsReviewing(true);
        try {
            const result = await reviewPostWithAi(Number(id), true);
            setAiReview(result);
        } catch {
            alert('AI 검토 실패. AI 서버, RAG 문서 적재, GitHub 토큰 설정을 확인하세요.');
        } finally {
            setIsReviewing(false);
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

                <label className="boardTitle">
                    태그
                    <input
                        type="text"
                        value={tags}
                        placeholder={"react, nestjs 처럼 쉼표로 구분"}
                        onChange={(e) => setTags(e.target.value)}
                    />
                </label>

                <button type="submit" className="writeButton">수정하기</button>

                <button type="button" className="writeButton" onClick={handleDelete}>삭제하기</button>
            </form>

            {isManager && (
            <section className="aiReviewPanel">
                <div className="aiReviewHeader">
                    <div>
                        <h2>AI 담당자 검토</h2>
                        <p>
                            게시글과 댓글 대화를 바탕으로 이전 문의를 검색하고,
                            담당자 답변 또는 GitHub Issue 등록 여부를 판단합니다.
                        </p>
                    </div>
                    <button type="button" onClick={handleAiReview} disabled={isReviewing}>
                        {isReviewing ? '검토 중' : 'AI 검토 실행'}
                    </button>
                </div>

                {aiReview && (
                    <div className="aiReviewGrid">
                        <article>
                            <h3>Agent 판단</h3>
                            <dl>
                                <div>
                                    <dt>문의 유형</dt>
                                    <dd>{aiReview.analysis.inquiryType}</dd>
                                </div>
                                <div>
                                    <dt>긴급도</dt>
                                    <dd>{aiReview.analysis.urgency}</dd>
                                </div>
                                <div>
                                    <dt>추천 액션</dt>
                                    <dd>{aiReview.analysis.suggestedAction}</dd>
                                </div>
                                <div>
                                    <dt>GitHub Issue</dt>
                                    <dd>{aiReview.githubIssueLog ? aiReview.githubIssueLog.status : '등록 안 함'}</dd>
                                </div>
                            </dl>
                        </article>

                        <article>
                            <h3>RAG 참고 문의</h3>
                            <ul>
                                {aiReview.analysis.references.map((reference) => (
                                    <li key={reference}>{reference}</li>
                                ))}
                            </ul>
                        </article>

                        <article className="aiReviewAnswer">
                            <h3>담당자 답변 추천</h3>
                            <p>{aiReview.recommendedAnswer}</p>
                        </article>
                    </div>
                )}
            </section>
            )}

            <table className="boardTable">
                <thead>
                <tr>
                    <th>번호</th>
                    <th>작성자</th>
                    <th>댓글 내용</th>
                    <th>삭제</th>
                </tr>
                </thead>

                <tbody>
                {comments.map((comment) => (
                    <tr key={comment.id}>
                        <td>{comment.id}</td>
                        <td>{comment.user?.nickname ?? comment.userId}</td>
                        <td>{comment.content}</td>
                        <td><button type={"button"} onClick={() => handleDeleteComment(comment.id)}>삭제</button></td>
                    </tr>
                ))}
                </tbody>
            </table>

            <form className={"boardForm"} onSubmit={handleCreateComment}>
                <textarea
                    value={commentContent}
                    placeholder={"댓글을 입력하세요."}
                    onChange={(e) => setCommentContent(e.target.value)}
                />
                <button type="submit" className={"writeButton"}>등록하기</button>
            </form>
        </>
    );
}

export default BoardDetailPage;
