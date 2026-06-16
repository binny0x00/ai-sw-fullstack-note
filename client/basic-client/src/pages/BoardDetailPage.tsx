/*
* 목록으로 돌아가기 버튼
* 게시물 제목
* 게시물 본문
* 달린 댓글
* 댓글 input
*/
import './css/Board.css'
import {Link, useNavigate, useParams} from "react-router-dom";
import {useEffect, useRef, useState} from "react";
import {
    applyDocRecommendation,
    approveGithubIssue,
    createComment,
    deletePost,
    getComments,
    getCurrentUserId,
    getCurrentUserRole,
    getLatestPostAiReview,
    getPost,
    getRagStatus,
    reviewPostWithAi,
    updatePost,
    type Comment,
    type Post,
    type PostAiReview,
    deleteComment,
    type DocRecommendation,
    type McpExecutionLog,
    type RagStatus,
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
    const [githubIssueLog, setGithubIssueLog] = useState<McpExecutionLog | null>(null);
    const [ragStatus, setRagStatus] = useState<RagStatus | null>(null);
    const [isReviewing, setIsReviewing] = useState(false);
    const [isApprovingIssue, setIsApprovingIssue] = useState(false);
    const [appendingIssueNumber, setAppendingIssueNumber] = useState<number | null>(null);
    const [hasFilledAiAnswer, setHasFilledAiAnswer] = useState(false);
    const [appliedDocRecommendations, setAppliedDocRecommendations] = useState<Set<string>>(new Set());
    const isApprovingIssueRef = useRef(false);
    const currentUserId = getCurrentUserId();
    const isManager = getCurrentUserRole() === 'MANAGER';
    const canManagePost = Boolean(post && (isManager || currentUserId === post.userId));
    const canDeleteComment = (comment: Comment) => (
        isManager || currentUserId === comment.userId
    );
    const canDeleteAnyComment = comments.some(canDeleteComment);
    const githubIssueUrl = getGithubIssueUrl(githubIssueLog);
    const handledGithubIssueNumber = getGithubIssueNumber(githubIssueLog);
    const normalizedDocRecommendations = normalizeDocRecommendations(
        aiReview?.docRecommendations ?? [],
    );
    const visibleDocRecommendations = normalizedDocRecommendations.filter(
        (recommendation) => isMarkdownFileName(recommendation.file),
    );
    const formatDate = (value: string) => new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(value));

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

    useEffect(() => {
        async function fetchLatestAiReview() {
            if (!id || !isManager) return;

            try {
                const latestReview = await getLatestPostAiReview(Number(id));

                if (!latestReview) return;

                setAiReview(latestReview);
                setGithubIssueLog(latestReview.githubIssueLog);
                setHasFilledAiAnswer(false);
                setAppliedDocRecommendations(new Set());
                isApprovingIssueRef.current = false;
            } catch {
                setAiReview(null);
            }
        }

        fetchLatestAiReview();
    }, [id, isManager]);

    useEffect(() => {
        async function fetchRagStatus() {
            if (!isManager) return;

            try {
                const status = await getRagStatus();
                setRagStatus(status);
            } catch {
                setRagStatus(null);
            }
        }

        fetchRagStatus();
    }, [isManager]);

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
            const result = await reviewPostWithAi(Number(id));
            setAiReview(result);
            setGithubIssueLog(result.githubIssueLog);
            setHasFilledAiAnswer(false);
            setAppliedDocRecommendations(new Set());
            isApprovingIssueRef.current = false;
        } catch {
            alert('AI 검토 실패. AI 서버, RAG 문서 적재, GitHub 토큰 설정을 확인하세요.');
        } finally {
            setIsReviewing(false);
        }
    }

    function handleFillAiAnswer() {
        if (!aiReview?.recommendedAnswer.trim()) return;

        setCommentContent(aiReview.recommendedAnswer);
        setHasFilledAiAnswer(true);
    }

    async function handleApproveGithubIssue() {
        if (
            !aiReview?.inquiry.id
            || githubIssueLog
            || isApprovingIssueRef.current
        ) return;

        isApprovingIssueRef.current = true;
        setIsApprovingIssue(true);
        try {
            const log = await approveGithubIssue(aiReview.inquiry.id, aiReview.repository);
            setGithubIssueLog(log);
        } catch {
            alert('GitHub Issue 등록 실패. GitHub 토큰과 MCP 설정을 확인하세요.');
            isApprovingIssueRef.current = false;
        } finally {
            setIsApprovingIssue(false);
        }
    }

    async function handleAppendToGithubIssue(issueNumber: number) {
        if (!aiReview?.inquiry.id || appendingIssueNumber !== null) return;

        setAppendingIssueNumber(issueNumber);
        try {
            const log = await approveGithubIssue(
                aiReview.inquiry.id,
                aiReview.repository,
                {
                    action: 'comment',
                    issueNumber,
                },
            );
            setGithubIssueLog(log);
            alert(`#${issueNumber} Issue에 문의 내용을 추가했습니다.`);
        } catch {
            alert('기존 GitHub Issue에 내용 추가 실패. GitHub 토큰과 Issue 권한을 확인하세요.');
        } finally {
            setAppendingIssueNumber(null);
        }
    }

    async function handleApplyDocRecommendation(recommendation: DocRecommendation) {
        if (!isMarkdownFileName(recommendation.file)) {
            alert('.md 문서에 연결된 보강 추천만 반영할 수 있습니다.');
            return;
        }

        const key = `${recommendation.file}:${recommendation.suggestion}`;

        try {
            await applyDocRecommendation(recommendation);
            setAppliedDocRecommendations((current) => new Set([...current, key]));
            alert('문서 보강 내용을 반영했습니다.');
        } catch (error) {
            alert(error instanceof Error ? error.message : '문서 보강 반영 실패');
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
                    <input
                        value={title}
                        disabled={!canManagePost}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </label>

                <label className="boardTitle">
                    내용
                    <textarea
                        value={content}
                        disabled={!canManagePost}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </label>

                <label className="boardTitle">
                    태그
                    <input
                        type="text"
                        value={tags}
                        disabled={!canManagePost}
                        placeholder={"문의, 오류, 개선 처럼 쉼표로 구분"}
                        onChange={(e) => setTags(e.target.value)}
                    />
                </label>

                {canManagePost && (
                    <div className="boardActionRow">
                        <button type="submit" className="writeButton">수정하기</button>
                        <button type="button" className="writeButton" onClick={handleDelete}>삭제하기</button>
                    </div>
                )}
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
                        {ragStatus && (
                            <p className={ragStatus.ready ? 'ragStatusReady' : 'ragStatusEmpty'}>
                                RAG: {ragStatus.collectionName} /
                                문서 {ragStatus.documentCount}개 /
                                임베딩 {ragStatus.embeddingCount}개
                            </p>
                        )}
                    </div>
                    <button type="button" onClick={handleAiReview} disabled={isReviewing}>
                        {isReviewing ? '검토 중' : 'AI 검토 실행'}
                    </button>
                </div>

                {aiReview && (
                    <div className="aiReviewGrid">
                        {aiReview.sourcePost && (
                            <article className="aiReviewSource">
                                <h3>원본 게시글 연결</h3>
                                <dl>
                                    <div>
                                        <dt>게시글</dt>
                                        <dd>#{aiReview.sourcePost.id} {aiReview.sourcePost.title}</dd>
                                    </div>
                                    <div>
                                        <dt>작성자</dt>
                                        <dd>{aiReview.sourcePost.author}</dd>
                                    </div>
                                    <div>
                                        <dt>댓글</dt>
                                        <dd>{aiReview.sourcePost.commentCount}개 반영</dd>
                                    </div>
                                    <div>
                                        <dt>태그</dt>
                                        <dd>
                                            {aiReview.sourcePost.tags.length > 0
                                                ? aiReview.sourcePost.tags.map((tag) => `#${tag}`).join(' ')
                                                : '없음'}
                                        </dd>
                                    </div>
                                </dl>
                                <p>{aiReview.sourcePost.content}</p>
                            </article>
                        )}

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
                                    <dd>{githubIssueLog ? githubIssueLog.status : '담당자 승인 대기'}</dd>
                                </div>
                            </dl>
                            {githubIssueUrl && (
                                <a
                                    className="issueLink"
                                    href={githubIssueUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    생성된 GitHub Issue 바로가기
                                </a>
                            )}
                            {aiReview.shouldCreateIssue && (
                                <button
                                    type="button"
                                    onClick={handleApproveGithubIssue}
                                    disabled={isApprovingIssue || Boolean(githubIssueLog)}
                                >
                                    {githubIssueLog
                                        ? 'Issue 처리 완료'
                                        : isApprovingIssue ? 'Issue 등록 중' : 'GitHub Issue 등록 승인'}
                                </button>
                            )}
                        </article>

                        <article>
                            <h3>RAG 참고 문의</h3>
                            <ul>
                                {aiReview.analysis.references.map((reference) => {
                                    const canOpenDoc = isMarkdownFileName(reference);

                                    return (
                                        <li key={reference}>
                                            {canOpenDoc ? (
                                                <Link
                                                    to={`/admin/docs/${encodeURIComponent(reference)}`}
                                                    state={{
                                                        recommendations: getRecommendationsForFile(
                                                            normalizedDocRecommendations,
                                                            reference,
                                                        ),
                                                    }}
                                                >
                                                    {reference}
                                                </Link>
                                            ) : (
                                                <span>{reference}</span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </article>

                        <article>
                            <h3>GitHub Issue 조회</h3>
                            {aiReview.mcpSearchLogs && aiReview.mcpSearchLogs.length > 0 ? (
                                <ul>
                                    {aiReview.mcpSearchLogs.flatMap((log) => {
                                        const issues = log.responsePayload.issues;

                                        if (!Array.isArray(issues) || issues.length === 0) {
                                            return [
                                                <li key={log.id}>
                                                    {String(log.responsePayload.message ?? '관련 Issue 없음')}
                                                </li>,
                                            ];
                                        }

                                        return issues.map((issue, index) => {
                                            const payload = issue as Record<string, unknown>;
                                            const issueNumber = Number(payload.number);
                                            const issueUrl = typeof payload.url === 'string'
                                                ? payload.url
                                                : null;
                                            const canAppend = Number.isInteger(issueNumber);
                                            const alreadyHandled = handledGithubIssueNumber === issueNumber;

                                            return (
                                                <li key={`${log.id}-${index}`}>
                                                    {issueUrl ? (
                                                        <a href={issueUrl} target="_blank" rel="noreferrer">
                                                            #{String(payload.number)} {String(payload.title)}
                                                        </a>
                                                    ) : (
                                                        <span>
                                                            #{String(payload.number)} {String(payload.title)}
                                                        </span>
                                                    )}
                                                    {' '}
                                                    ({String(payload.state)})
                                                    {canAppend && !alreadyHandled && (
                                                        <>
                                                            {' '}
                                                            <button
                                                                type="button"
                                                                disabled={appendingIssueNumber === issueNumber}
                                                                onClick={() => handleAppendToGithubIssue(issueNumber)}
                                                            >
                                                                {appendingIssueNumber === issueNumber
                                                                    ? '추가 중'
                                                                    : '이 Issue에 내용 추가'}
                                                            </button>
                                                        </>
                                                    )}
                                                </li>
                                            );
                                        });
                                    })}
                                </ul>
                            ) : (
                                <p>아직 조회된 GitHub Issue가 없습니다.</p>
                            )}
                        </article>

                        <article>
                            <h3>.md 문서 보강 추천</h3>
                            {visibleDocRecommendations.length > 0 ? (
                                <div className="docRecommendationList">
                                    {visibleDocRecommendations.map((recommendation) => {
                                        const key = `${recommendation.file}:${recommendation.suggestion}`;
                                        const applied = appliedDocRecommendations.has(key);

                                        return (
                                            <div key={key} className="docRecommendationItem">
                                                <p>
                                                    <strong>
                                                        <Link
                                                            to={`/admin/docs/${encodeURIComponent(recommendation.file)}`}
                                                            state={{recommendations: [recommendation]}}
                                                        >
                                                            {recommendation.file}
                                                        </Link>
                                                    </strong>
                                                    {recommendation.suggestion}
                                                </p>
                                                <button
                                                    type="button"
                                                    disabled={applied}
                                                    onClick={() => handleApplyDocRecommendation(recommendation)}
                                                >
                                                    {applied ? '반영 완료' : '반영하기'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p>현재 문의 기준으로 즉시 보강할 문서 추천은 없습니다.</p>
                            )}
                        </article>

                        <article className="aiReviewAnswer">
                            <div className="aiReviewAnswerHeader">
                                <h3>담당자 답변 추천</h3>
                                <button
                                    type="button"
                                    onClick={handleFillAiAnswer}
                                    disabled={hasFilledAiAnswer}
                                >
                                    {hasFilledAiAnswer ? '입력 완료' : '댓글 입력창에 채우기'}
                                </button>
                            </div>
                            <p>{aiReview.recommendedAnswer}</p>
                        </article>
                    </div>
                )}
            </section>
            )}

            <table className="boardTable">
                <thead>
                <tr>
                    <th>작성자</th>
                    <th>댓글 내용</th>
                    <th>작성일</th>
                    {canDeleteAnyComment && <th>삭제</th>}
                </tr>
                </thead>

                <tbody>
                {comments.map((comment) => (
                    <tr key={comment.id}>
                        <td>{comment.user?.nickname ?? comment.userId}</td>
                        <td>{comment.content}</td>
                        <td>{formatDate(comment.createdAt)}</td>
                        {canDeleteAnyComment && (
                            <td>
                                {canDeleteComment(comment) && (
                                    <button type="button" onClick={() => handleDeleteComment(comment.id)}>
                                        삭제
                                    </button>
                                )}
                            </td>
                        )}
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

function getGithubIssueUrl(log: McpExecutionLog | null) {
    if (!log) return null;

    const issueUrl = log.responsePayload.issue_url ?? log.responsePayload.issueUrl;

    return typeof issueUrl === 'string' ? issueUrl : null;
}

function getGithubIssueNumber(log: McpExecutionLog | null) {
    if (!log) return null;

    const issueNumber = log.responsePayload.issue_number ?? log.responsePayload.issueNumber;
    const normalizedIssueNumber = Number(issueNumber);

    return Number.isInteger(normalizedIssueNumber) ? normalizedIssueNumber : null;
}

function normalizeDocRecommendations(recommendations: Array<DocRecommendation | string>) {
    return recommendations.map((recommendation) => {
        if (typeof recommendation !== 'string') {
            return {
                file: normalizeMarkdownFileName(recommendation.file),
                suggestion: recommendation.suggestion ?? '',
            };
        }

        if (recommendation === '[object Object]') {
            return {
                file: '',
                suggestion: '추천 내용을 표시할 수 없습니다. AI 검토를 다시 실행해 주세요.',
            };
        }

        try {
            const parsed = JSON.parse(recommendation) as Partial<DocRecommendation>;

            return {
                file: normalizeMarkdownFileName(parsed.file),
                suggestion: typeof parsed.suggestion === 'string'
                    ? parsed.suggestion
                    : recommendation,
            };
        } catch {
            // Python dict string fallback below.
        }

        const fileMatch = recommendation.match(/'file': '([^']+)'/);
        const suggestionMatch = recommendation.match(/'suggestion': '([^']+)'/);

        return {
            file: normalizeMarkdownFileName(fileMatch?.[1]),
            suggestion: suggestionMatch?.[1] ?? recommendation,
        };
    });
}

function getRecommendationsForFile(
    recommendations: DocRecommendation[],
    fileName: string,
) {
    return recommendations.filter((recommendation) => recommendation.file === fileName);
}

function isMarkdownFileName(fileName?: string) {
    return Boolean(fileName && /^[^/\\]+\.md$/.test(fileName));
}

function normalizeMarkdownFileName(fileName?: string): string {
    return isMarkdownFileName(fileName) ? fileName ?? '' : '';
}
