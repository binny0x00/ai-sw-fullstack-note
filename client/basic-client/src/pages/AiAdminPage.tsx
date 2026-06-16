import {useEffect, useState} from "react";
import {Link, Navigate} from "react-router-dom";
import {
    getAiSettings,
    getCurrentUserRole,
    getObservabilitySummary,
    getRagStatus,
    updateAiSettings,
    type AiSettings,
    type ObservabilitySummary,
    type RagStatus,
} from "../api.ts";
import './css/AiAdmin.css';

type AdminTab = 'settings' | 'rag' | 'observability';

const operationItems = [
    '고객 답변 톤',
    '내부 기술 이슈 노출 정책',
    '개발팀 전달 및 GitHub Issue 생성 기준',
    '추가 프롬프트 지침',
    'RAG 문서 적재 후 검색 품질 검증',
];

function AiAdminPage() {
    const isManager = getCurrentUserRole() === 'MANAGER';
    const [settings, setSettings] = useState<AiSettings | null>(null);
    const [ragStatus, setRagStatus] = useState<RagStatus | null>(null);
    const [observability, setObservability] = useState<ObservabilitySummary | null>(null);
    const [activeTab, setActiveTab] = useState<AdminTab>('settings');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isManager) return;

        async function fetchSettings() {
            try {
                const [data, status, summary] = await Promise.all([
                    getAiSettings(),
                    getRagStatus(),
                    getObservabilitySummary(),
                ]);
                setSettings(data);
                setRagStatus(status);
                setObservability(summary);
            } catch (error) {
                alert(error instanceof Error ? error.message : 'AI 설정 조회 실패');
            } finally {
                setIsLoading(false);
            }
        }

        fetchSettings();
    }, [isManager]);

    if (!isManager) {
        return <Navigate to="/home" replace />;
    }

    function updateField(field: keyof AiSettings, value: string) {
        if (!settings) return;

        setSettings({
            ...settings,
            [field]: value,
        });
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!settings) return;

        if (
            !settings.answerTone.trim()
            || !settings.technicalIssuePolicy.trim()
            || !settings.escalationPolicy.trim()
        ) {
            alert('고객 답변 톤, 기술 이슈 처리 정책, 외부 액션 기준은 비워둘 수 없습니다.');
            return;
        }

        setIsSaving(true);
        try {
            const savedSettings = await updateAiSettings(settings);
            setSettings(savedSettings);
            alert('AI 설정 저장 성공');
        } catch (error) {
            alert(error instanceof Error ? error.message : 'AI 설정 저장 실패');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <main className="aiAdminPage">
            <div className="aiAdminHeader">
                <div>
                    <h1>AI 운영 관리</h1>
                    <p>
                        게시글 AI 검토에서 사용할 답변 정책과 Agent 판단 기준을 커스터마이징합니다.
                    </p>
                </div>
                <Link to="/home" className="backButton">홈으로</Link>
            </div>

            <section className="aiAdminNotice">
                <h2>운영 반영 범위</h2>
                <p>
                    저장한 설정은 이후 실행되는 AI 검토부터 반영됩니다. 자동로그인처럼 새 기능 추가나
                    기존 기능 개선을 요청하는 문의는 GitHub Issue 생성 대상으로 분류하는 것이 기본 운영 기준입니다.
                </p>
            </section>

            {isLoading && <p>AI 설정을 불러오는 중입니다.</p>}

            <div className="aiAdminTabs" role="tablist">
                <button
                    type="button"
                    className={activeTab === 'settings' ? 'active' : ''}
                    onClick={() => setActiveTab('settings')}
                >
                    AI 설정
                </button>
                <button
                    type="button"
                    className={activeTab === 'rag' ? 'active' : ''}
                    onClick={() => setActiveTab('rag')}
                >
                    RAG 상태
                </button>
                <button
                    type="button"
                    className={activeTab === 'observability' ? 'active' : ''}
                    onClick={() => setActiveTab('observability')}
                >
                    실행 로그
                </button>
            </div>

            {settings && activeTab === 'settings' && (
                <form className="aiAdminForm" onSubmit={handleSubmit}>
                    <label>
                        고객 답변 톤
                        <textarea
                            value={settings.answerTone}
                            onChange={(e) => updateField('answerTone', e.target.value)}
                        />
                    </label>

                    <label>
                        기술 이슈 처리 정책
                        <textarea
                            value={settings.technicalIssuePolicy}
                            onChange={(e) => updateField('technicalIssuePolicy', e.target.value)}
                        />
                    </label>

                    <label>
                        개발팀 전달 및 외부 액션 기준
                        <textarea
                            value={settings.escalationPolicy}
                            onChange={(e) => updateField('escalationPolicy', e.target.value)}
                        />
                    </label>

                    <label>
                        추가 프롬프트 지침
                        <textarea
                            value={settings.customInstructions}
                            placeholder="예: 결제 문의는 긴급도 high로 검토하고 담당자 확인 문구를 포함한다."
                            onChange={(e) => updateField('customInstructions', e.target.value)}
                        />
                    </label>

                    <div className="aiAdminActionRow">
                        <button type="submit" disabled={isSaving}>
                            {isSaving ? '저장 중' : 'AI 설정 저장'}
                        </button>
                    </div>
                </form>
            )}

            {activeTab === 'rag' && (
            <section className="aiAdminGrid">
                <article className="aiAdminCard">
                    <div className="aiAdminCardHeader">
                        <h2>기업 운영 관리 항목</h2>
                        <span>MANAGER</span>
                    </div>
                    <ul>
                        {operationItems.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </article>

                <article className="aiAdminCard">
                    <div className="aiAdminCardHeader">
                        <h2>RAG 문서 관리</h2>
                        <span>{ragStatus?.ready ? '검색 가능' : '적재 필요'}</span>
                    </div>
                    {ragStatus && (
                        <dl className="ragStatusList">
                            <div>
                                <dt>컬렉션</dt>
                                <dd>{ragStatus.collectionName}</dd>
                            </div>
                            <div>
                                <dt>문서</dt>
                                <dd>{ragStatus.documentCount}개</dd>
                            </div>
                            <div>
                                <dt>임베딩</dt>
                                <dd>{ragStatus.embeddingCount}개</dd>
                            </div>
                        </dl>
                    )}
                    <p>
                        문서는 현재 서버의 docs 폴더에서 관리하고, 변경 후 문서 적재 스크립트를 실행해야 합니다.
                    </p>
                    <code>ai-server/ai-inquiry-rag-server/docs/*.md</code>
                    <code>.venv/bin/python scripts/ingest_docs.py</code>
                </article>
            </section>
            )}

            {observability && activeTab === 'observability' && (
                <section className="aiAdminRunbook">
                    <h2>실행 관찰 요약</h2>
                    <dl>
                        <div>
                            <dt>API 응답</dt>
                            <dd>
                                요청 {Math.round(observability.api.requestCount)}건 /
                                평균 {Math.round(observability.api.averageDurationMs)}ms /
                                실패율 {(observability.api.failureRate * 100).toFixed(1)}%
                            </dd>
                        </div>
                        <div>
                            <dt>Agent 단계</dt>
                            <dd>
                                단계 {Math.round(observability.agent.stepCount)}건 /
                                평균 {Math.round(observability.agent.averageStepDurationMs)}ms /
                                LLM {Math.round(observability.agent.averageLlmDurationMs)}ms
                            </dd>
                        </div>
                        <div>
                            <dt>MCP 호출</dt>
                            <dd>
                                호출 {Math.round(observability.mcp.callCount)}건 /
                                실패율 {(observability.mcp.failureRate * 100).toFixed(1)}%
                            </dd>
                        </div>
                    </dl>

                    <div className="agentStepList">
                        {observability.recentSteps.map((step) => (
                            <article key={`${step.createdAt}-${step.stepName}`}>
                                <strong>{step.stepName}</strong>
                                <span>{step.status}</span>
                                <small>{step.durationMs}ms</small>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}

export default AiAdminPage;
