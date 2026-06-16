/*
* 목록으로 돌아가기 버튼
* 게시물 제목 입력
* 게시물 본문 입력
* 저장 버튼
*/
import './css/Board.css'
import {Link, useNavigate} from "react-router-dom";
import {useState} from "react";
import {createPost, precheckPost, type PostPrecheckResult} from '../api';

function BoardWritePage() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    const [precheckResult, setPrecheckResult] = useState<PostPrecheckResult | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const tagNames = parseTagNames(tags);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        try {
            setIsChecking(true);
            const result = await precheckPost(title, content, tagNames);
            setPrecheckResult(result);

            if (result.needsMoreInfo) {
                return;
            }

            await submitPost();
        } catch {
            alert('게시글 AI 점검 또는 작성에 실패했습니다.');
        } finally {
            setIsChecking(false);
        }
    }

    async function submitPost() {
        try {
            setIsSubmitting(true);
            await createPost(title, content, tagNames);
            alert('게시글 작성 성공');
            navigate('/board');
        } catch {
            alert('게시글 작성 실패');
        } finally {
            setIsSubmitting(false);
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

                <label className="boardTitle">
                    태그
                    <input
                        type="text"
                        value={tags}
                        placeholder={"문의, 오류, 개선 처럼 쉼표로 구분"}
                        onChange={(e) => setTags(e.target.value)}
                    />
                </label>

                {precheckResult ? (
                    <section className="postPrecheckPanel" aria-live="polite">
                        <div>
                            <strong>
                                {precheckResult.needsMoreInfo
                                    ? 'AI가 추가 정보를 요청합니다.'
                                    : 'AI 점검을 통과했습니다.'}
                            </strong>
                            <p>{precheckResult.reason}</p>
                        </div>

                        {precheckResult.questions.length > 0 ? (
                            <ol>
                                {precheckResult.questions.map((question) => (
                                    <li key={question}>{question}</li>
                                ))}
                            </ol>
                        ) : null}

                        <div className="boardActionRow">
                            <button
                                type="button"
                                className="writeButton"
                                disabled={isSubmitting}
                                onClick={submitPost}
                            >
                                그래도 등록하기
                            </button>
                        </div>
                    </section>
                ) : null}

                <button
                    type="submit"
                    className={"writeButton"}
                    disabled={isChecking || isSubmitting}
                >
                    {isChecking ? 'AI 점검 중...' : 'AI 점검 후 등록'}
                </button>
            </form>
        </>
    );
}

function parseTagNames(tags: string) {
    return tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
}

export default BoardWritePage;
