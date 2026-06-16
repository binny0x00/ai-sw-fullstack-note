# AI Helpdesk 게시판

React, NestJS, PostgreSQL, FastAPI, RAG, MCP, LangGraph Agent를 연결한 AI 문의 게시판입니다.

사용자가 문의 게시글을 작성하면 관리자가 AI 검토를 실행하고, Agent가 RAG 문서 검색과 GitHub Issue 조회 결과를 바탕으로 답변 초안을 생성합니다. 운영자는 초안을 댓글 입력창에 채워 수정한 뒤 등록할 수 있고, 개발 작업이 필요한 경우 GitHub Issue 생성을 직접 승인할 수 있습니다.

## 프로젝트 목적

이 프로젝트는 상용 LLM을 실제 웹 서비스 흐름에 연결하는 연습을 목표로 합니다. 단순히 LLM 답변을 출력하는 것이 아니라 게시판 데이터, RAG 검색, 외부 API 도구 호출, Agent 상태 흐름, 관리자 승인, 실행 로그와 모니터링을 하나의 업무 흐름으로 구성했습니다.

주요 사용자는 다음과 같습니다.

- 일반 사용자: 문의 게시글 작성, 댓글 확인
- 관리자: AI 답변 초안 생성, RAG/MCP/Agent 실행 상태 확인, GitHub Issue 생성 승인
- 개발자: AI가 분류한 개발 이슈와 GitHub Issue를 통해 후속 작업 관리

해결하려는 문제는 반복 문의 처리, 유사 사례 검색, 외부 이슈 상태 확인, 답변 초안 작성, 개발팀 전달 과정을 한 화면에서 관리하는 것입니다.

## 기술 스택

| 영역 | 기술 | 역할 |
|---|---|---|
| Frontend | React, TypeScript, Vite | 게시판 화면, 관리자 화면, AI 검토 결과 UI |
| Backend | NestJS, TypeORM | 인증, 게시판 CRUD, 댓글, 태그, 관리자 API 프록시 |
| AI Server | FastAPI | RAG, MCP, Agent, 관찰 로그 처리 |
| Database | PostgreSQL | 사용자, 게시글, 댓글, 문의, 분석 결과, 로그 저장 |
| Vector DB | PostgreSQL pgvector | RAG 문서 embedding 저장과 유사도 검색 |
| RAG | LangChain, PGVector | 문서 검색, LLM 프롬프트 근거 구성 |
| MCP | MCP Python SDK, JSON-RPC | GitHub Issue 조회/생성 도구화 |
| Agent | LangGraph | RAG, MCP, LLM 생성, 저장 단계를 명시적 그래프로 구성 |
| LLM | OpenAI API | embedding, 답변 초안 생성, 문의 분류 |

## 주요 구현 기능

### 기본 게시판

- 회원가입, 로그인
- JWT 기반 인증
- 사용자/관리자 역할 구분
- 게시글 생성, 목록 조회, 상세 조회, 수정, 삭제
- 댓글 작성, 목록 조회, 삭제
- 태그 입력과 표시
- 게시글 검색
- 페이징

### RAG 기반 기능

- 데이터 소스: `ai-server/ai-inquiry-rag-server/docs/*.md`, 게시판 게시글
- 전처리: Markdown 문서를 LangChain `Document`로 변환 후 chunk 단위로 분리
- Embedding 모델: OpenAI `text-embedding-3-small`
- Vector DB: PostgreSQL pgvector, LangChain PGVector 테이블 사용
- 검색 방식: 문의 제목과 본문을 질의로 만들어 top-k 유사 문서 검색
- 게시글 embedding: 게시글 생성/수정 시 자동 저장, 삭제 시 관련 vector chunk 제거
- LLM 연결: 검색된 문서 context와 source metadata를 답변 초안 생성 프롬프트에 포함
- 화면 제공:
  - 게시글 상세의 관리자 AI 검토 패널에서 RAG 참고 문서 표시
  - 관리자 화면에서 RAG 컬렉션, 문서 수, embedding 수, 적재 상태 표시

### MCP 기반 기능

- MCP Server: `ai-server/ai-inquiry-rag-server/scripts/github_mcp_server.py`
- 외부 서비스: GitHub API
- 구현 도구:
  - `search_github_issues`: GitHub Issue 조회
  - `create_github_issue_with_project`: GitHub Issue 생성 및 GitHub Projects 등록
- 연결 방식:
  - FastAPI가 MCP Client 역할을 수행
  - MCP Server는 stdio transport로 실행
  - MCP tool 호출은 JSON-RPC 기반 요청/응답 구조로 처리
- API Key 관리:
  - `.env`의 `GITHUB_TOKEN` 사용
  - Issue/Project 권한이 있는 토큰 필요
- 사용자 기능 연결:
  - Agent가 답변 초안 생성 전 GitHub Issue를 조회해 초안에 반영
  - GitHub Issue 생성은 자동 실행하지 않고 관리자 승인 버튼을 눌렀을 때만 실행
  - MCP 호출 결과는 `mcp_execution_logs`에 저장

### Agent 기반 기능

Agent의 목적은 문의 게시글을 분석해 담당자 답변 초안을 만들고, 개발팀 전달 여부를 판단하는 것입니다.

LangGraph 흐름:

```text
문의 게시글
-> RAG 검색
-> MCP GitHub Issue 조회
-> LLM 답변 초안 생성
-> 분석 결과 저장
-> 관리자 화면 표시
```

Agent State에는 문의 내용, RAG 문서, references, MCP 결과, MCP context, 분석 결과, tool call 목록, loop count가 포함됩니다.

무한 루프 방지는 다음 방식으로 처리했습니다.

- `tool_loop_count`로 도구 반복 횟수 제한
- `tool_loop_complete` 상태로 종료 조건 명시
- RAG, MCP, LLM 호출 실패 시 HTTP 예외와 로그로 원인 확인 가능

답변 초안은 게시글 상세 화면에 표시되고, 관리자는 `댓글 입력창에 채우기` 버튼으로 초안을 댓글 폼에 자동 입력할 수 있습니다.

## 관찰 가능성 설계

이 프로젝트의 차별점은 AI 기능의 실행 과정을 관찰 가능하게 설계했다는 점입니다.

기록하는 항목:

- 사용자 요청: FastAPI API 요청 경로, 상태 코드, 응답 시간, 실패 여부
- RAG 검색: 검색 query, 참고 문서 수, references, 처리 시간
- MCP 호출: GitHub Issue 조회/생성 요청과 응답 payload
- Agent 단계: RAG 검색, MCP 조회, LLM 생성 단계별 상태와 처리 시간
- 모니터링 요약: API 평균 응답 시간, LLM 호출 시간, 실패율, MCP 실패율

관리자 화면 `/admin/ai`에서 RAG 적재 상태와 최근 Agent 단계 로그, API/MCP/Agent 요약 지표를 확인할 수 있습니다.

## 전체 아키텍처

```text
React
  -> NestJS API Server
    -> PostgreSQL
    -> FastAPI AI Server
      -> OpenAI API
      -> PostgreSQL pgvector
      -> MCP Client
        -> MCP Server
          -> GitHub API
```

### 요청 흐름

```text
1. 사용자가 게시글을 작성한다.
2. 관리자가 게시글 상세 화면에서 AI 검토를 실행한다.
3. NestJS가 게시글과 댓글을 문의 데이터로 변환해 FastAPI에 전달한다.
4. FastAPI Agent가 RAG 문서를 검색한다.
5. Agent가 MCP tool로 GitHub Issue를 조회한다.
6. LLM이 RAG/MCP 결과를 근거로 답변 초안과 추천 액션을 생성한다.
7. 분석 결과와 Agent 단계 로그가 DB에 저장된다.
8. React 화면에 원본 게시글, RAG references, GitHub Issue 조회 결과, 답변 초안이 표시된다.
9. 관리자가 답변 초안을 댓글 입력창에 채워 수정 후 등록한다.
10. 개발 작업이 필요하면 관리자가 GitHub Issue 생성을 승인한다.
```

## 디렉터리 구조

```text
.
├── client/basic-client              # React 게시판/관리자 화면
├── server/basic-server              # NestJS API 서버
├── ai-server/ai-inquiry-rag-server  # FastAPI RAG/MCP/Agent 서버
├── infra/postgres-pgvector          # PostgreSQL + pgvector Docker 구성
└── docs                             # 성능 평가, 시스템 학습 자료
```

## 실행 방법

### 1. PostgreSQL 실행

```bash
cd infra/postgres-pgvector
docker compose up -d
```

### 2. AI 서버 설정

```bash
cd ai-server/ai-inquiry-rag-server
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

`.env` 주요 값:

```text
DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/inquiry_rag"
OPENAI_API_KEY="replace-me"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
OPENAI_CHAT_MODEL="gpt-4.1-mini"
GITHUB_TOKEN="replace-me"
GITHUB_REPOSITORY="binny0x00/ai-sw-fullstack-note"
```

문서 적재:

```bash
python scripts/ingest_docs.py
```

AI 서버 실행:

```bash
uvicorn app.main:app --reload
```

### 3. NestJS 서버 실행

```bash
cd server/basic-server
npm install
npm run start:dev
```

운영 환경에서는 TypeORM `synchronize`를 사용하지 않고 migration 기반으로 실행합니다.

```bash
npm run migration:run
NODE_ENV=production npm run start:prod
```

### 4. React 클라이언트 실행

```bash
cd client/basic-client
npm install
npm run dev
```

## 주요 화면

- `/signup`: 회원가입
- `/login`: 로그인
- `/home`: 홈
- `/board`: 게시글 목록, 검색, 페이징
- `/board/write`: 게시글 작성
- `/board/:id`: 게시글 상세, 댓글, 관리자 AI 검토
- `/admin/ai`: AI 운영 설정, RAG 상태, 모니터링 요약

## 데모 시나리오

```text
1. 사용자가 회원가입 후 로그인한다.
2. 문의성 게시글을 작성한다.
3. 관리자가 로그인해 게시글 상세 화면으로 이동한다.
4. 관리자가 AI 검토 실행 버튼을 누른다.
5. Agent가 RAG 검색과 GitHub Issue 조회를 수행한다.
6. 화면에 RAG 참고 문서, GitHub Issue 조회 결과, 답변 초안이 표시된다.
7. 관리자가 답변 초안을 댓글 입력창에 채운다.
8. 관리자가 초안을 수정하고 댓글로 등록한다.
9. 개발 작업이 필요하면 GitHub Issue 등록을 승인한다.
10. 관리자 화면에서 RAG 적재 상태와 Agent/API/MCP 실행 로그를 확인한다.
```

## 구현 체크리스트

### 기본 기능

- [x] React 프로젝트 구성
- [x] 백엔드 프로젝트 구성
- [x] 데이터베이스 연결
- [x] 회원가입
- [x] 로그인
- [x] 게시물 생성
- [x] 게시물 목록 조회
- [x] 게시물 상세 조회
- [x] 게시물 수정
- [x] 게시물 삭제
- [x] 댓글
- [x] 태그
- [x] 페이징
- [x] 검색

### AI 기능

- [x] RAG 데이터 소스 선정
- [x] 데이터 전처리와 chunking
- [x] Embedding 모델 선정
- [x] pgvector 기반 Vector DB 사용
- [x] 문서 embedding 저장
- [x] 유사 문서 검색
- [x] 검색 결과 기반 LLM 답변 생성
- [x] MCP Server 구조 설계
- [x] GitHub API 연동
- [x] API Key 관리 전략
- [x] MCP 기능을 게시판 관리자 기능과 연결
- [x] Agent State 구조 설계
- [x] LangGraph 실행 흐름 설계
- [x] 무한 루프 방지 조건
- [x] 예외 처리
- [x] 답변 초안 UI 표시
- [x] AI 실행 과정 로그와 모니터링 요약

## 한계점

- RAG 데이터 소스는 Markdown 문서와 게시글을 함께 사용하지만, 게시글 댓글까지 실시간 embedding에 포함하는 부분은 확장 여지가 있습니다.
- GitHub Issue 조회는 repository와 token 설정에 의존하므로 배포 환경의 권한 구성이 필요합니다.
- 관리자 화면은 학습용 운영 도구 수준이며, 실제 서비스라면 상세 필터, 기간 검색, 차트가 필요합니다.
- LLM 응답 품질은 프롬프트와 RAG 문서 품질에 영향을 받습니다.
- 스크린샷과 데모 영상은 별도 제출 자료로 보강해야 합니다.

## 개선 아이디어

- 게시글 작성 중 실시간 유사 게시글 추천
- 댓글 변경 시 게시글 embedding 재생성
- GitHub Issue뿐 아니라 Pull Request, Jira, Slack 등 추가 MCP tool 연동
- Agent 단계별 상세 trace 화면
- 운영 지표 차트화
- 답변 초안 승인 이력 관리
- 사용자별 문의 처리 상태 알림
