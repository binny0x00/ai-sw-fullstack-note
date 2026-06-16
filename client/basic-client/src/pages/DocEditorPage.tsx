import {useEffect, useMemo, useRef, useState} from "react";
import {Link, Navigate, useLocation, useParams} from "react-router-dom";
import {
    applyDocRecommendation,
    getCurrentUserRole,
    getMarkdownDoc,
    updateMarkdownDoc,
    type DocRecommendation,
} from "../api.ts";
import './css/DocEditor.css';

type DocEditorState = {
    recommendations?: DocRecommendation[];
};

function DocEditorPage() {
    const {fileName} = useParams();
    const location = useLocation();
    const isManager = getCurrentUserRole() === 'MANAGER';
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [appliedRecommendations, setAppliedRecommendations] = useState<Set<string>>(new Set());
    const isSavingRef = useRef(false);
    const applyingRecommendationsRef = useRef<Set<string>>(new Set());
    const recommendations = useMemo(
        () => ((location.state as DocEditorState | null)?.recommendations ?? []),
        [location.state],
    );

    useEffect(() => {
        async function fetchDoc() {
            if (!fileName) return;

            try {
                const doc = await getMarkdownDoc(fileName);
                setContent(doc.content);
            } catch (error) {
                alert(error instanceof Error ? error.message : '문서 조회 실패');
            } finally {
                setIsLoading(false);
            }
        }

        fetchDoc();
    }, [fileName]);

    if (!isManager) {
        return <Navigate to="/home" replace />;
    }

    async function handleSave() {
        if (!fileName || isSavingRef.current) return;

        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const saved = await updateMarkdownDoc(fileName, content);
            setContent(saved.content);
            alert(`문서를 저장했습니다.${formatIndexResult(saved.index_result)}`);
        } catch (error) {
            alert(error instanceof Error ? error.message : '문서 저장 실패');
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    }

    async function handleApplyRecommendation(recommendation: DocRecommendation) {
        if (!fileName) return;

        const targetFile = isMarkdownFileName(recommendation.file)
            ? recommendation.file
            : fileName;
        const key = `${targetFile}:${recommendation.suggestion}`;

        if (applyingRecommendationsRef.current.has(key)) return;

        applyingRecommendationsRef.current.add(key);
        try {
            const result = await applyDocRecommendation({
                ...recommendation,
                file: targetFile,
            });
            const doc = await getMarkdownDoc(fileName);
            setContent(doc.content);
            setAppliedRecommendations((current) => new Set([...current, key]));
            alert(`${result.file}에 보강 코멘트를 반영했습니다.${formatIndexResult(result.index_result)}`);
        } catch (error) {
            alert(error instanceof Error ? error.message : '문서 보강 반영 실패');
        } finally {
            applyingRecommendationsRef.current.delete(key);
        }
    }

    return (
        <main className="docEditorPage">
            <div className="docEditorHeader">
                <div>
                    <h1>{fileName}</h1>
                    <p>RAG 참고 문서를 확인하고 AI가 제안한 보강 코멘트를 반영합니다.</p>
                </div>
                <Link to="/board" className="backButton">게시판으로</Link>
            </div>

            {recommendations.length > 0 && (
                <section className="docRecommendationPanel">
                    <h2>보강 코멘트</h2>
                    {recommendations.map((recommendation) => {
                        const key = `${recommendation.file}:${recommendation.suggestion}`;
                        const applied = appliedRecommendations.has(key);

                        return (
                            <article key={key}>
                                <p>{recommendation.suggestion}</p>
                                <button
                                    type="button"
                                    disabled={applied}
                                    onClick={() => handleApplyRecommendation(recommendation)}
                                >
                                    {applied ? '반영 완료' : '반영하기'}
                                </button>
                            </article>
                        );
                    })}
                </section>
            )}

            {isLoading ? (
                <p>문서를 불러오는 중입니다.</p>
            ) : (
                <section className="docEditorPanel">
                    <textarea
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                    />
                    <div className="docEditorActions">
                        <button type="button" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? '저장 중' : '문서 저장'}
                        </button>
                    </div>
                </section>
            )}
        </main>
    );
}

export default DocEditorPage;

function isMarkdownFileName(fileName?: string) {
    return Boolean(fileName && /^[^/\\]+\.md$/.test(fileName));
}

function formatIndexResult(indexResult?: { chunk_count?: number; chunkCount?: number } | null) {
    if (!indexResult) {
        return '';
    }

    const chunkCount = indexResult.chunk_count ?? indexResult.chunkCount ?? 0;

    return ` RAG 벡터 ${chunkCount}개 chunk를 갱신했습니다.`;
}
