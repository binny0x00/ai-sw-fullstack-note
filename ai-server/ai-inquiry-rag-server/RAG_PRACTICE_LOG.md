# FastAPI + pgvector RAG 실습 기록

이 문서는 `AI Inquiry RAG Server` 실습 과정을 한눈에 정리하기 위한 기록용 문서입니다.
각 단계의 명령어를 실행한 뒤, 실제 응답값을 `내 실행 결과` 영역에 붙여넣으면 됩니다.

## 1. 프로젝트 목적

이 프로젝트는 사용자의 문의를 AI Agent가 분석하고, RAG로 관련 문서를 검색한 뒤,
필요하면 GitHub Issue 생성 같은 외부 액션을 제안하는 문의 처리 관리자 시스템입니다.

핵심 구성은 아래와 같습니다.

```text
FastAPI
-> 문의 등록 API
-> pgvector 기반 RAG 검색
-> OpenAI embedding / chat completion
-> AI Agent 분석
-> MCP 실행 로그 저장
```

## 2. 전체 흐름

```text
1. PostgreSQL + pgvector 실행
2. 샘플 문서 embedding 생성
3. pgvector에 문서 chunk 저장
4. FastAPI 서버 실행
5. RAG 검색 테스트
6. 문의 등록
7. AI 분석 요청
8. GitHub Issue 생성 승인 흐름 테스트
```

## 3. 프로젝트 구조

```text
ai-inquiry-rag-server/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── schemas.py
│   ├── rag/
│   │   ├── loader.py
│   │   ├── splitter.py
│   │   ├── embeddings.py
│   │   ├── vector_store.py
│   │   └── service.py
│   └── services/
│       ├── inquiry_service.py
│       ├── agent_service.py
│       └── mcp_service.py
├── docs/
├── scripts/
│   └── ingest_docs.py
├── requirements.txt
├── .env.example
└── README.md
```

PostgreSQL + pgvector 컨테이너 설정과 초기 SQL은 아래 공용 infra 폴더에 둡니다.

```text
infra/postgres-pgvector/
├── docker-compose.yml
└── init/
    └── 001_schema.sql
```

## 4. 사전 준비

### 4.1. 가상환경 활성화

```bash
cd ~/ai-sw-fullstack-note/ai-server/ai-inquiry-rag-server
source .venv/bin/activate
```

### 4.2. 패키지 설치

```bash
python -m pip install -r requirements.txt
```

### 4.3. 환경변수 설정

`.env` 파일에 실제 OpenAI API 키를 넣습니다.

```env
OPENAI_API_KEY="실제_API_KEY"
```

확인할 주요 값:

```env
DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/inquiry_rag"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
OPENAI_CHAT_MODEL="gpt-4.1-mini"
```

## 5. PostgreSQL + pgvector 실행

### 실행 명령어

```bash
cd ~/ai-sw-fullstack-note/infra/postgres-pgvector
docker compose up -d
```

### 확인 명령어

```bash
cd ~/ai-sw-fullstack-note/infra/postgres-pgvector
docker compose ps
```

### 내 실행 결과

```text
여기에 docker compose ps 결과를 붙여넣기
```

## 6. RAG 문서 적재

### 실행 명령어

```bash
python scripts/ingest_docs.py
```

### 기대 결과

```text
Ingested 5 chunks from 5 documents.
```

문서 길이에 따라 chunk 개수는 달라질 수 있습니다.

### 내 실행 결과

```text
여기에 python scripts/ingest_docs.py 결과를 붙여넣기
```

## 7. FastAPI 서버 실행

### 실행 명령어

```bash
uvicorn app.main:app --reload
```

### 접속 URL

```text
http://127.0.0.1:8000
http://127.0.0.1:8000/docs
```

### 내 실행 결과

```text
여기에 uvicorn 실행 로그를 붙여넣기
```

## 8. 상태 확인 API

### 요청

```bash
curl http://127.0.0.1:8000/health
```

### 기대 응답

```json
{
  "status": "ok"
}
```

### 내 응답값

```json
{
  "status": "ok"
}%
```

## 9. RAG 검색 테스트

이 단계는 AI 답변을 생성하기 전에, pgvector 검색이 제대로 되는지 확인하는 단계입니다.

### 요청

```bash
curl -X POST http://127.0.0.1:8000/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "로그인 버튼을 눌러도 반응이 없고 CORS 에러가 떠요.",
    "top_k": 3
  }'
```

### 기대 포인트

- `cors-error.md`가 상위 결과에 포함되는지 확인
- `auth-login-api.md` 또는 `past-login-issue-001.md`가 함께 검색되는지 확인
- 각 결과에 `content`, `source`, `title`, `category`, `distance`가 있는지 확인

### 내 응답값

```json
{
  "query": "로그인 버튼을 눌러도 반응이 없고 CORS 에러가 떠요.",
  "results": [
    {
      "content": "# 로그인 API 문서\n\n## 기능\n\n사용자의 이메일과 비밀번호를 받아 인증하고 access token을 발급한다.\n\n## 요청\n\n`POST /auth/login`\n\n```json\n{\n \"email\": \"user@example.com\",\n \"password\": \"password\"\n}\n```\n\n## 주요 실패 원인\n\n- 이메일 또는 비밀번호 불일치\n- API 서버 미실행\n- CORS 설정 누락\n- JWT 발급 설정 오류\n\n## 운영 대응\n\n로그인 장애 문의가 들어오면 CORS, 인증 실패, 서버 상태를 순서대로 확인한다.",
      "source": "auth-login-api.md",
      "title": "로그인 API 문서",
      "category": "api_doc",
      "distance": 0.43406585763210914
    },
    {
      "content": "# JWT 만료 대응 가이드\n\n## 증상\n\n로그인 후 일정 시간이 지나 API 요청이 401 Unauthorized로 실패한다.\n\n## 원인\n\naccess token이 만료되었거나 refresh token 재발급 흐름이 실패했을 수 있다.\n\n## 해결 방향\n\n- access token 만료 시간 확인\n- refresh token API 동작 확인\n- 프론트엔드에서 401 응답 처리 로직 확인",
      "source": "jwt-expired.md",
      "title": "JWT 만료 대응 가이드",
      "category": "manual",
      "distance": 0.5746185273514415
    }
  ]
}%
```

## 10. 문의 등록 테스트

문의 등록 단계에서는 AI 분석 필드가 아직 `null`로 나오는 것이 정상입니다.

### 요청

```bash
curl -X POST http://127.0.0.1:8000/inquiries \
  -H "Content-Type: application/json" \
  -d '{
    "title": "로그인 버튼 클릭 시 반응 없음",
    "body": "로그인 버튼을 눌러도 아무 반응이 없고, 크롬 개발자 도구에는 CORS 에러가 표시됩니다.",
    "customer_email": "user@example.com"
  }'
```

### 기대 응답 예시

```json
{
  "id": 1,
  "title": "로그인 버튼 클릭 시 반응 없음",
  "body": "로그인 버튼을 눌러도 아무 반응이 없고, 크롬 개발자 도구에는 CORS 에러가 표시됩니다.",
  "customer_email": "user@example.com",
  "status": "received",
  "inquiry_type": null,
  "urgency": null,
  "ai_summary": null,
  "suggested_action": null
}
```

### 왜 null인가?

`POST /inquiries`는 문의만 저장합니다.

아래 필드는 AI 분석 API를 호출한 뒤 채워집니다.

```text
inquiry_type
urgency
ai_summary
suggested_action
```

### 내 응답값

```json
{
  "id": 1,
  "title": "로그인 버튼 클릭 시 반응 없음",
  "body": "로그인 버튼을 눌러도 아무 반응이 없고, 크롬 개발자 도구에는 CORS 에러가 표시됩니다.",
  "customer_email": "user@example.com",
  "status": "received",
  "inquiry_type": null,
  "urgency": null,
  "ai_summary": null,
  "suggested_action": null
}%
```

## 11. 문의 목록 조회

### 요청

```bash
curl http://127.0.0.1:8000/inquiries
```

### 내 응답값

```json
[
  {
    "id": 1,
    "title": "로그인 버튼 클릭 시 반응 없음",
    "body": "로그인 버튼을 눌러도 아무 반응이 없고, 크롬 개발자 도구에는 CORS 에러가 표시됩니다.",
    "customer_email": "user@example.com",
    "status": "received",
    "inquiry_type": null,
    "urgency": null,
    "ai_summary": null,
    "suggested_action": null
  }
]%
```

## 12. 문의 상세 조회

`1`은 실제 문의 등록 응답에서 받은 `id`로 바꿔도 됩니다.

### 요청

```bash
curl http://127.0.0.1:8000/inquiries/1
```

### 내 응답값

```json
{
  "id": 1,
  "title": "로그인 버튼 클릭 시 반응 없음",
  "body": "로그인 버튼을 눌러도 아무 반응이 없고, 크롬 개발자 도구에는 CORS 에러가 표시됩니다.",
  "customer_email": "user@example.com",
  "status": "received",
  "inquiry_type": null,
  "urgency": null,
  "ai_summary": null,
  "suggested_action": null
}%
```

## 13. AI Agent 분석 테스트

이 단계에서 RAG 검색 결과를 참고해 문의 유형, 긴급도, 답변 초안, GitHub Issue 생성 필요 여부를 판단합니다.

### 요청

```bash
curl -X POST http://127.0.0.1:8000/inquiries/1/analyze
```

### 기대 응답 예시

```json
{
  "inquiry_id": 1,
  "inquiry_type": "bug",
  "urgency": "medium",
  "answer_draft": "문의 내용을 보면 CORS 설정 누락 가능성이 있습니다...",
  "suggested_action": "github_issue_recommended",
  "references": [
    "auth-login-api.md",
    "cors-error.md",
    "past-login-issue-001.md"
  ]
}
```

### 확인할 점

- `inquiry_type`이 문의 성격에 맞는지 확인
- `urgency`가 적절한지 확인
- `answer_draft`가 참고 문서를 근거로 작성됐는지 확인
- `references`에 실제 검색된 문서 출처가 포함됐는지 확인
- 재현 가능한 버그라면 `suggested_action`이 `github_issue_recommended`인지 확인

### 내 응답값

```json
{
  "inquiry_id": 1,
  "inquiry_type": "bug",
  "urgency": "high",
  "answer_draft": "로그인 버튼 클릭 시 발생하는 반응 없음 현상과 크롬 개발자 도구의 CORS 에러는 서버 간 교차 출처 요청 제한에 기인할 수 있습니다. 서버 측에서 CORS 정책을 적절히 설정했는지 확인하 고, 프론트엔드에서 요청 헤더를 올바르게 설정하는지 점검해주시기 바랍니다. 추후 문 제 해결을 위해 해당 이슈를 개발팀에 공유하겠습니다.",
  "suggested_action": "github_issue_recommended",
  "references": [
  ]
}%
```

## 14. AI 분석 후 문의 상세 재조회

분석 API 호출 후에는 문의 상세 응답의 AI 관련 필드가 채워져야 합니다.

### 요청

```bash
curl http://127.0.0.1:8000/inquiries/1
```

### 기대 변화

```json
{
  "status": "analyzed",
  "inquiry_type": "bug",
  "urgency": "medium",
  "ai_summary": "...",
  "suggested_action": "github_issue_recommended"
}
```

### 내 응답값

```json
{
  "id": 1,
  "title": "로그인 버튼 클릭 시 반응 없음",
  "body": "로그인 버튼을 눌러도 아무 반응이 없고, 크롬 개발자 도구에는 CORS 에러가 표시됩니다.",
  "customer_email": "user@example.com",
  "status": "analyzed",
  "inquiry_type": "bug",
  "urgency": "high",
  "ai_summary": "로그인 버튼 클릭 시 발생하는 반응 없음 현상과 크롬 개발자 도구의 CORS 에러는 서버 간 교차 출처 요청 제한에 기인할 수 있습니다. 서버 측에서 CORS 정책을 적절히 설 정했는지 확인하고, 프론트엔드에서 요청 헤더를 올바르게 설정하는지 점검해주시기 바 랍니다. 추후 문제 해결을 위해 해당 이슈를 개발팀에 공유하겠습니다.",
  "suggested_action": "github_issue_recommended"
}%
```

## 15. GitHub Issue 생성 승인 흐름 테스트

현재 코드는 승인 요청이 들어오면 FastAPI가 MCP client로
`scripts/github_mcp_server.py`의 `create_github_issue_with_project` tool을 호출합니다.
MCP tool은 GitHub REST API로 실제 Issue를 생성하고,
GitHub GraphQL API로 `ai-inquiry` Projects 보드에 Issue를 등록한 뒤
요청/응답 결과를 `mcp_execution_logs` 테이블에 저장합니다.

`.env`에 Issues와 Projects 쓰기 권한이 있는 GitHub 토큰이 필요합니다.

```env
GITHUB_TOKEN="github_pat_..."
GITHUB_PROJECT_OWNER="binny0x00"
GITHUB_PROJECT_TITLE="ai-inquiry"
GITHUB_PROJECT_STATUS_FIELD="Status"
GITHUB_PROJECT_STATUS_OPTION="Todo"
```

### 승인 요청

```bash
curl -X POST http://127.0.0.1:8000/inquiries/1/github-issue \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "repository": "your-name/your-repo"
  }'
```

### 기대 응답 포인트

```json
{
  "tool_name": "github_issue",
  "status": "created"
}
```

### 내 응답값

```json
{
  "id": 1,
  "inquiry_id": 1,
  "tool_name": "github_issue",
  "status": "created",
  "request_payload": {
    "mcp_server": "/.../scripts/github_mcp_server.py",
    "tool_name": "create_github_issue_with_project",
    "body": "## 문의 내용\n\n로그인 버튼을 눌러도 아무 반응이 없고, 크롬 개발자 도구에는 CORS 에러가 표시됩니다.\n\n## AI 분석 요약\n\n...\n\n## 메타데이터\n\n- inquiry_id: 1\n- inquiry_type: bug\n- urgency: high\n- suggested_action: github_issue_recommended\n- customer_email: unknown",
    "title": "[bug] 로그인 버튼 클릭 시 반응 없음",
    "inquiry_id": 1,
    "urgency": "high",
    "repository": "your-name/your-repo",
    "inquiry_type": "bug",
    "suggested_action": "github_issue_recommended"
  },
  "response_payload": {
    "message": "GitHub Issue was created.",
    "issue_number": 1,
    "issue_node_id": "I_kwDO...",
    "issue_url": "https://github.com/your-name/your-repo/issues/1",
    "api_url": "https://api.github.com/repos/your-name/your-repo/issues/1",
    "project": {
      "status": "added",
      "project_id": "PVT_kwHO...",
      "project_title": "ai-inquiry",
      "project_number": 1,
      "project_item_id": "PVTI_lAHO...",
      "status_field": {
        "status": "updated",
        "field": "Status",
        "option": "Todo"
      }
    }
  },
  "created_at": "2026-06-16T01:07:20.308303Z"
}%
```

### 미승인 요청

```bash
curl -X POST http://127.0.0.1:8000/inquiries/1/github-issue \
  -H "Content-Type: application/json" \
  -d '{
    "approved": false,
    "repository": "your-name/your-repo"
  }'
```

### 기대 응답 포인트

```json
{
  "tool_name": "github_issue",
  "status": "skipped"
}
```

### 내 응답값

```json
{
  "id": 2,
  "inquiry_id": 1,
  "tool_name": "github_issue",
  "status": "skipped",
  "request_payload": {
    "body": "로그인 버튼을 눌러도 아 무 반응이 없고, 크롬 개발자 도구에는 CORS 에러가 표시됩니다.",
    "title": "로그인 버튼 클릭 시 반응 없음",
    "urgency": "high",
    "repository": "your-name/your-repo",
    "inquiry_type": "bug",
    "suggested_action": "github_issue_recommended"
  },
  "response_payload": {
    "message": "Manager did not approve GitHub Issue creation."
  },
  "created_at": "2026-06-16T01:08:28.456360Z"
}%
```

## 16. API별 역할 정리

| API                                 | 역할           |     AI 사용 여부 | DB 저장 여부 |
|-------------------------------------|--------------|-------------:|---------:|
| `GET /health`                       | 서버 상태 확인     |          아니오 |      아니오 |
| `POST /rag/search`                  | 관련 문서 검색     | embedding 사용 |      아니오 |
| `POST /inquiries`                   | 문의 등록        |          아니오 |        예 |
| `GET /inquiries`                    | 문의 목록 조회     |          아니오 |      아니오 |
| `GET /inquiries/{id}`               | 문의 상세 조회     |          아니오 |      아니오 |
| `POST /inquiries/{id}/analyze`      | RAG 기반 AI 분석 |            예 |        예 |
| `POST /inquiries/{id}/github-issue` | GitHub Issue 생성, Projects 등록, MCP 실행 로그 저장 | 아니오 | 예 |

## 17. 중요한 설계 포인트

### RAG와 Agent를 분리한 이유

RAG는 관련 문서를 검색하는 역할입니다.
Agent는 검색 결과를 바탕으로 문의 유형, 긴급도, 외부 액션 필요 여부를 판단합니다.

```text
RAG: 근거 검색
Agent: 판단과 처리 방향 결정
MCP: 외부 도구 실행 경계
```

### pgvector를 사용하는 이유

문서 chunk의 embedding을 PostgreSQL에 저장하고, 문의 embedding과의 cosine distance를 기준으로 비슷한 문서를 찾기 위해 사용합니다.

현재 검색 쿼리는 아래 흐름을 따릅니다.

```sql
ORDER BY embedding <=> CAST(:query_embedding AS vector)
```

`<=>`는 pgvector의 cosine distance 연산자입니다.

### metadata를 저장하는 이유

RAG 답변에서 출처를 표시하려면 chunk 내용만 저장하면 부족합니다.

그래서 각 chunk에 아래 정보를 함께 저장합니다.

```text
source
title
category
chunk_index
```

## 18. 자주 만난 에러와 해결

### ModuleNotFoundError: No module named 'app'

원인:

```text
python scripts/ingest_docs.py
```

로 실행하면 Python import 기준 경로가 `scripts/`가 됩니다.

해결:

`scripts/ingest_docs.py`에서 프로젝트 루트를 `sys.path`에 추가했습니다.

### SQLAlchemy f405 ProgrammingError

원인:

pgvector embedding 값을 SQLAlchemy가 PostgreSQL vector 타입으로 변환하지 못할 때 발생할 수 있습니다.

해결:

embedding을 vector literal 문자열로 바꾼 뒤 SQL에서 `CAST(... AS vector)`로 처리했습니다.

### AI 관련 필드가 null로 나오는 경우

원인:

문의 등록만 했고 아직 분석 API를 호출하지 않은 상태입니다.

해결:

```bash
curl -X POST http://127.0.0.1:8000/inquiries/1/analyze
```

실행 후 다시 상세 조회합니다.

## 19. 다음 확장 과제

- 실제 GitHub Issue 생성 API 또는 MCP 도구 연결
- 관리자 승인 UI 추가
- RAG 검색 결과 score threshold 적용
- 문서 chunk 중복 적재 방지 강화
- AI 분석 결과 재분석 이력 관리
- pytest 기반 API 테스트 추가
- Alembic을 사용한 DB migration 관리
