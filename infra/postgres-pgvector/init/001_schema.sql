CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS inquiries (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    customer_email TEXT,
    status TEXT NOT NULL DEFAULT 'received',
    inquiry_type TEXT,
    urgency TEXT,
    ai_summary TEXT,
    suggested_action TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_analysis_results (
    id BIGSERIAL PRIMARY KEY,
    inquiry_id BIGINT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    inquiry_type TEXT NOT NULL,
    urgency TEXT NOT NULL,
    answer_draft TEXT NOT NULL,
    suggested_action TEXT NOT NULL,
    "references" JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mcp_execution_logs (
    id BIGSERIAL PRIMARY KEY,
    inquiry_id BIGINT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    status TEXT NOT NULL,
    request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_step_logs (
    id BIGSERIAL PRIMARY KEY,
    inquiry_id BIGINT REFERENCES inquiries(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    status TEXT NOT NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_request_logs (
    id BIGSERIAL PRIMARY KEY,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    failed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    answer_tone TEXT NOT NULL DEFAULT '고객에게 정중하고 간결하게 답변한다. 문의 의견에 감사하고, 확인 후 안내하겠다는 표현을 사용한다.',
    technical_issue_policy TEXT NOT NULL DEFAULT 'CORS, JWT, API 서버, 환경변수, 백엔드 설정처럼 개발자가 확인해야 하는 기술 원인은 사용자에게 직접 설명하지 않는다. 개발팀에 전달해 확인 후 안내하겠다고 답변한다.',
    escalation_policy TEXT NOT NULL DEFAULT '재현 가능한 오류, 운영 장애, 개발 작업이 필요한 설정 누락은 GitHub Issue 생성을 권장한다. 자동로그인, 알림, 검색 개선처럼 새 기능 추가나 기존 기능 개선을 요청하는 문의도 개발팀 검토가 필요하므로 GitHub Issue 생성을 권장한다.',
    custom_instructions TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ai_settings_singleton CHECK (id = 1)
);

INSERT INTO ai_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
