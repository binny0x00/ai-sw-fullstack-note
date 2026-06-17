# 001_schema.sql 스키마 정리

이 문서는 `001_schema.sql`에 정의된 PostgreSQL 스키마를 한눈에 확인하기 위한 설명 문서입니다.

## 개요

| 구분 | 내용 |
| --- | --- |
| 대상 파일 | `infra/postgres-pgvector/init/001_schema.sql` |
| DB | PostgreSQL |
| 사용 확장 | `vector` |
| 주요 도메인 | 고객 문의 저장, AI 분석 결과 저장, MCP 실행 로그, 에이전트 단계 로그, API 요청 로그, AI 답변 정책 설정 |

## 확장 기능

| 확장 | 설명 |
| --- | --- |
| `vector` | pgvector 확장입니다. 현재 스키마에는 vector 타입 컬럼이 없지만, 임베딩 저장 또는 벡터 검색 기능을 추가할 수 있도록 확장을 활성화합니다. |

## 테이블 요약

| 테이블 | 역할 | 주요 관계 |
| --- | --- | --- |
| `inquiries` | 고객 문의 원문과 처리 상태를 저장하는 중심 테이블 | 다른 로그/분석 테이블에서 참조 |
| `ai_analysis_results` | 문의에 대한 AI 분석 결과와 답변 초안을 저장 | `inquiries(id)` 참조 |
| `mcp_execution_logs` | MCP 도구 실행 요청/응답 로그 저장 | `inquiries(id)` 참조 |
| `agent_step_logs` | 에이전트 처리 단계별 실행 로그 저장 | `inquiries(id)` 참조 |
| `api_request_logs` | API 요청 처리 결과와 성능 로그 저장 | 독립 테이블 |
| `ai_settings` | AI 답변 톤과 정책 설정 저장 | 싱글턴 테이블 |

## 테이블 상세

### inquiries

고객 문의의 원문, 분류, 긴급도, 처리 상태, AI 요약 등을 저장하는 메인 테이블입니다.

| 컬럼 | 타입 | 제약/기본값 | 설명 |
| --- | --- | --- | --- |
| `id` | `BIGSERIAL` | `PRIMARY KEY` | 문의 고유 ID |
| `post_id` | `BIGINT` | nullable | 외부 게시글 또는 원본 글 ID로 사용할 수 있는 값 |
| `title` | `TEXT` | `NOT NULL` | 문의 제목 |
| `body` | `TEXT` | `NOT NULL` | 문의 본문 |
| `customer_email` | `TEXT` | nullable | 고객 이메일 |
| `status` | `TEXT` | `NOT NULL DEFAULT 'received'` | 문의 처리 상태 |
| `inquiry_type` | `TEXT` | nullable | 문의 유형 |
| `urgency` | `TEXT` | nullable | 긴급도 |
| `ai_summary` | `TEXT` | nullable | AI가 생성한 문의 요약 |
| `suggested_action` | `TEXT` | nullable | AI 또는 시스템이 제안한 후속 조치 |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | 생성 시각 |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | 수정 시각 |

### ai_analysis_results

문의별 AI 분석 결과를 저장합니다. 문의 삭제 시 관련 분석 결과도 함께 삭제됩니다.

| 컬럼 | 타입 | 제약/기본값 | 설명 |
| --- | --- | --- | --- |
| `id` | `BIGSERIAL` | `PRIMARY KEY` | AI 분석 결과 고유 ID |
| `inquiry_id` | `BIGINT` | `NOT NULL`, `REFERENCES inquiries(id) ON DELETE CASCADE` | 분석 대상 문의 ID |
| `inquiry_type` | `TEXT` | `NOT NULL` | AI가 판단한 문의 유형 |
| `urgency` | `TEXT` | `NOT NULL` | AI가 판단한 긴급도 |
| `answer_draft` | `TEXT` | `NOT NULL` | AI가 생성한 답변 초안 |
| `suggested_action` | `TEXT` | `NOT NULL` | 권장 후속 조치 |
| `"references"` | `JSONB` | `NOT NULL DEFAULT '[]'::jsonb` | 답변 생성 시 참고한 자료 목록 |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | 생성 시각 |

### mcp_execution_logs

문의 처리 중 MCP 도구를 실행한 내역을 저장합니다. 문의 삭제 시 관련 로그도 함께 삭제됩니다.

| 컬럼 | 타입 | 제약/기본값 | 설명 |
| --- | --- | --- | --- |
| `id` | `BIGSERIAL` | `PRIMARY KEY` | MCP 실행 로그 고유 ID |
| `inquiry_id` | `BIGINT` | `NOT NULL`, `REFERENCES inquiries(id) ON DELETE CASCADE` | 관련 문의 ID |
| `tool_name` | `TEXT` | `NOT NULL` | 실행한 MCP 도구 이름 |
| `status` | `TEXT` | `NOT NULL` | 실행 상태 |
| `request_payload` | `JSONB` | `NOT NULL DEFAULT '{}'::jsonb` | 도구 실행 요청 데이터 |
| `response_payload` | `JSONB` | `NOT NULL DEFAULT '{}'::jsonb` | 도구 실행 응답 데이터 |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | 생성 시각 |

### agent_step_logs

에이전트가 문의를 처리하는 과정에서 단계별 입력, 출력, 소요 시간을 저장합니다. 문의 삭제 시 관련 로그도 함께 삭제됩니다.

| 컬럼 | 타입 | 제약/기본값 | 설명 |
| --- | --- | --- | --- |
| `id` | `BIGSERIAL` | `PRIMARY KEY` | 에이전트 단계 로그 고유 ID |
| `inquiry_id` | `BIGINT` | `REFERENCES inquiries(id) ON DELETE CASCADE`, nullable | 관련 문의 ID |
| `step_name` | `TEXT` | `NOT NULL` | 처리 단계 이름 |
| `status` | `TEXT` | `NOT NULL` | 단계 실행 상태 |
| `duration_ms` | `INTEGER` | `NOT NULL DEFAULT 0` | 단계 실행 소요 시간(ms) |
| `input_payload` | `JSONB` | `NOT NULL DEFAULT '{}'::jsonb` | 단계 입력 데이터 |
| `output_payload` | `JSONB` | `NOT NULL DEFAULT '{}'::jsonb` | 단계 출력 데이터 |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | 생성 시각 |

### api_request_logs

API 요청 처리 결과와 응답 시간을 저장하는 독립 로그 테이블입니다.

| 컬럼 | 타입 | 제약/기본값 | 설명 |
| --- | --- | --- | --- |
| `id` | `BIGSERIAL` | `PRIMARY KEY` | API 요청 로그 고유 ID |
| `method` | `TEXT` | `NOT NULL` | HTTP 메서드 |
| `path` | `TEXT` | `NOT NULL` | 요청 경로 |
| `status_code` | `INTEGER` | `NOT NULL` | HTTP 응답 상태 코드 |
| `duration_ms` | `INTEGER` | `NOT NULL DEFAULT 0` | 요청 처리 소요 시간(ms) |
| `failed` | `BOOLEAN` | `NOT NULL DEFAULT false` | 실패 여부 |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | 생성 시각 |

### ai_settings

AI 답변 생성에 사용할 톤, 기술 이슈 안내 정책, 에스컬레이션 정책, 사용자 지정 지시사항을 저장합니다.
`id = 1`만 허용하는 싱글턴 테이블입니다.

| 컬럼 | 타입 | 제약/기본값 | 설명 |
| --- | --- | --- | --- |
| `id` | `INTEGER` | `PRIMARY KEY DEFAULT 1`, `CHECK (id = 1)` | 설정 행 ID. 항상 `1`만 허용 |
| `answer_tone` | `TEXT` | `NOT NULL DEFAULT ...` | 고객 답변 톤 지시사항 |
| `technical_issue_policy` | `TEXT` | `NOT NULL DEFAULT ...` | 기술적 원인을 고객에게 어떻게 안내할지에 대한 정책 |
| `escalation_policy` | `TEXT` | `NOT NULL DEFAULT ...` | GitHub Issue 생성 등 개발팀 검토가 필요한 상황에 대한 정책 |
| `custom_instructions` | `TEXT` | `NOT NULL DEFAULT ''` | 추가 사용자 지정 지시사항 |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | 수정 시각 |

## 관계 정리

| 기준 테이블 | 참조 테이블 | 관계 | 삭제 동작 |
| --- | --- | --- | --- |
| `inquiries.id` | `ai_analysis_results.inquiry_id` | 문의 1개에 여러 AI 분석 결과 연결 가능 | 문의 삭제 시 분석 결과 삭제 |
| `inquiries.id` | `mcp_execution_logs.inquiry_id` | 문의 1개에 여러 MCP 실행 로그 연결 가능 | 문의 삭제 시 MCP 로그 삭제 |
| `inquiries.id` | `agent_step_logs.inquiry_id` | 문의 1개에 여러 에이전트 단계 로그 연결 가능 | 문의 삭제 시 단계 로그 삭제 |

## 제약 조건

| 이름/대상 | 내용 | 설명 |
| --- | --- | --- |
| 각 테이블 `id` | `PRIMARY KEY` | 각 행을 고유하게 식별 |
| `ai_analysis_results.inquiry_id` | `FOREIGN KEY ... ON DELETE CASCADE` | 문의 삭제 시 AI 분석 결과 자동 삭제 |
| `mcp_execution_logs.inquiry_id` | `FOREIGN KEY ... ON DELETE CASCADE` | 문의 삭제 시 MCP 실행 로그 자동 삭제 |
| `agent_step_logs.inquiry_id` | `FOREIGN KEY ... ON DELETE CASCADE` | 문의 삭제 시 에이전트 단계 로그 자동 삭제 |
| `ai_settings_singleton` | `CHECK (id = 1)` | 설정 테이블에 하나의 행만 사용하도록 제한 |

## 기본 데이터

| 테이블 | 초기 데이터 | 목적 |
| --- | --- | --- |
| `ai_settings` | `id = 1` 행을 삽입. 이미 있으면 무시 | 애플리케이션 시작 시 기본 AI 설정을 항상 사용할 수 있게 함 |

```sql
INSERT INTO ai_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
```

## 운영 시 참고 사항

| 항목 | 설명 |
| --- | --- |
| 시간 컬럼 | 대부분 `created_at`은 자동 입력되지만, `updated_at`은 자동 갱신 트리거가 없습니다. 수정 시 애플리케이션에서 직접 갱신해야 합니다. |
| 상태값 | `status`, `urgency`, `inquiry_type`은 자유 텍스트입니다. 값의 일관성이 중요하면 애플리케이션 레벨 검증 또는 DB 체크 제약을 추가할 수 있습니다. |
| 로그 테이블 | `mcp_execution_logs`, `agent_step_logs`, `api_request_logs`는 누적 로그 성격이므로 운영 환경에서는 보관 기간이나 정리 정책을 별도로 둘 수 있습니다. |
| 인덱스 | 현재 명시적 인덱스는 기본키와 외래키 제약 외에는 없습니다. 조회 패턴에 따라 `inquiry_id`, `created_at`, `status` 등에 인덱스를 추가할 수 있습니다. |
