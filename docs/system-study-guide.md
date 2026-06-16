# AI 게시판 시스템 학습 가이드

## 1. 이 문서의 목적

이 문서는 현재 프로젝트를 공부할 때 어디서부터 읽고, 어떤 개념을 연결해서
이해해야 하는지 정리한 학습용 가이드입니다.

이 프로젝트는 단순 게시판에 AI 기능을 따로 붙인 구조가 아니라, 사용자가
작성한 게시글을 담당자가 AI로 검토하고 처리하는 흐름을 목표로 합니다.

```text
React 게시판
  -> NestJS 게시판 API
  -> FastAPI AI 서버
  -> LangChain RAG / Agent / MCP
  -> PostgreSQL + pgvector
```

핵심 학습 목표는 다음입니다.

- React와 NestJS로 기본 게시판 기능을 구성하는 방식
- JWT 인증과 `USER` / `MANAGER` 권한 분리 방식
- 게시글을 AI 문의 컨텍스트로 변환하는 방식
- LangChain으로 RAG 검색과 답변 생성을 연결하는 방식
- PostgreSQL과 pgvector를 같은 DB에서 함께 사용하는 방식
- MCP를 통해 외부 서비스인 GitHub Issue 생성까지 연결하는 방식

## 2. 전체 시스템 구조

현재 프로젝트는 크게 네 영역으로 나뉩니다.

```text
client/basic-client
  React 프론트엔드

server/basic-server
  NestJS 백엔드
  회원가입, 로그인, 게시판, 댓글, 태그, 관리자 AI 검토 API 담당

ai-server/ai-inquiry-rag-server
  FastAPI AI 서버
  LangChain RAG, Agent 판단, MCP GitHub 연동 담당

infra/postgres-pgvector
  PostgreSQL + pgvector Docker Compose와 초기 스키마
```

데이터 흐름은 다음 순서로 이해하면 됩니다.

```text
1. 일반 사용자가 게시글을 작성한다.
2. 게시글과 댓글은 NestJS가 PostgreSQL에 저장한다.
3. `MANAGER` 권한 사용자가 게시글 상세에서 AI 검토를 실행한다.
4. NestJS가 게시글, 태그, 댓글을 하나의 문의 본문으로 합친다.
5. NestJS가 FastAPI AI 서버에 문의를 등록한다.
6. FastAPI가 LangChain PGVector로 유사 문서를 검색한다.
7. Agent가 RAG 검색 결과를 참고해 답변 초안과 처리 방향을 판단한다.
8. GitHub Issue가 필요하면 MCP 서비스가 GitHub API를 호출한다.
9. 결과가 다시 React 관리자 화면에 표시된다.
```

## 3. 먼저 읽을 파일 순서

처음부터 모든 파일을 읽기보다 아래 순서로 읽는 것이 좋습니다.

### 3.1 프론트엔드 흐름

1. `client/basic-client/src/App.tsx`
2. `client/basic-client/src/api.ts`
3. `client/basic-client/src/pages/LoginPage.tsx`
4. `client/basic-client/src/pages/BoardPage.tsx`
5. `client/basic-client/src/pages/BoardDetailPage.tsx`
6. `client/basic-client/src/pages/BoardWritePage.tsx`

중점적으로 볼 부분:

- 로그인 후 `accessToken`과 `userRole`을 저장하는 방식
- `getAuthHeader()`가 API 요청에 JWT를 붙이는 방식
- `getCurrentUserRole()`로 관리자 여부를 판단하는 방식
- 게시글 상세 화면에서 `MANAGER`에게만 AI 검토 패널을 보여주는 방식
- `reviewPostWithAi()`가 `POST /posts/:id/ai-review`를 호출하는 방식

### 3.2 NestJS 인증과 권한

1. `server/basic-server/src/auth/entities/user.entity.ts`
2. `server/basic-server/src/auth/auth.service.ts`
3. `server/basic-server/src/auth/jwt-auth.guard.ts`
4. `server/basic-server/src/auth/manager.guard.ts`
5. `server/basic-server/src/auth/auth.module.ts`

중점적으로 볼 부분:

- 회원가입 시 기본 `role`이 `USER`로 저장되는 구조
- 관리자는 DB에서 `role = 'MANAGER'`로 바꿔 부여하는 구조
- 로그인 응답과 JWT payload에 `role`이 포함되는 구조
- `JwtAuthGuard`가 인증된 사용자 정보를 `request.user`에 넣는 구조
- `ManagerGuard`가 `MANAGER` 권한만 통과시키는 구조

관리자 계정 승격 SQL 예시:

```sql
UPDATE users
SET role = 'MANAGER'
WHERE email = 'manager@example.com';
```

### 3.3 NestJS 게시판과 AI 검토 연결

1. `server/basic-server/src/posts/posts.controller.ts`
2. `server/basic-server/src/posts/posts.service.ts`
3. `server/basic-server/src/posts/dto/ai-review-post.dto.ts`
4. `server/basic-server/src/inquiries/inquiries.module.ts`
5. `server/basic-server/src/inquiries/inquiries.service.ts`
6. `server/basic-server/src/inquiries/ai-inquiry-server.client.ts`

중점적으로 볼 부분:

- 게시글 CRUD와 댓글 기능이 일반 게시판 기능으로 유지되는 구조
- `POST /posts/:id/ai-review`가 관리자 전용 API인 이유
- `PostsService.reviewWithAi()`가 게시글을 AI 문의로 변환하는 방식
- `buildPostInquiryBody()`가 게시글, 태그, 댓글을 하나의 텍스트로 합치는 방식
- `InquiriesService`가 직접 AI 결과를 만들지 않고 FastAPI 서버에 위임하는 방식
- FastAPI가 저장한 결과를 같은 DB에서 다시 읽는 구조

## 4. FastAPI AI 서버 읽는 순서

### 4.1 API 진입점

1. `ai-server/ai-inquiry-rag-server/app/main.py`
2. `ai-server/ai-inquiry-rag-server/app/schemas.py`
3. `ai-server/ai-inquiry-rag-server/app/services/inquiry_service.py`

중점적으로 볼 부분:

- `/inquiries`로 문의를 생성하는 구조
- `/inquiries/{id}/analyze`로 Agent 분석을 실행하는 구조
- `/inquiries/{id}/github-issue`로 GitHub Issue 생성을 승인하는 구조
- `post_id`를 저장해서 게시글과 AI 문의 이력을 연결하는 구조

### 4.2 RAG 구현

1. `ai-server/ai-inquiry-rag-server/app/rag/loader.py`
2. `ai-server/ai-inquiry-rag-server/app/rag/splitter.py`
3. `ai-server/ai-inquiry-rag-server/app/rag/embeddings.py`
4. `ai-server/ai-inquiry-rag-server/app/rag/vector_store.py`
5. `ai-server/ai-inquiry-rag-server/app/rag/service.py`
6. `ai-server/ai-inquiry-rag-server/scripts/ingest_docs.py`

현재 RAG는 LangChain 기반입니다.

```text
문서 로딩
  -> RecursiveCharacterTextSplitter로 chunk 분리
  -> OpenAIEmbeddings로 embedding 생성
  -> LangChain PGVector로 PostgreSQL pgvector에 저장
  -> similarity_search_with_score로 유사 문서 검색
```

중점적으로 볼 개념:

- RAG는 LLM이 모르는 내부 지식을 프롬프트에 넣어주는 구조입니다.
- Embedding은 텍스트를 벡터로 바꾸는 과정입니다.
- Vector DB는 질문 벡터와 문서 벡터의 유사도를 계산합니다.
- pgvector는 PostgreSQL 안에서 벡터 검색을 가능하게 하는 확장입니다.
- LangChain PGVector는 직접 SQL을 작성하지 않고 vector store API로 검색하게 해줍니다.

### 4.3 Agent 구현

1. `ai-server/ai-inquiry-rag-server/app/services/agent_service.py`

현재 Agent는 아래 역할을 합니다.

```text
1. 게시글 문의 내용을 검색 쿼리로 사용한다.
2. RAG로 관련 문서를 찾는다.
3. ChatPromptTemplate으로 판단 프롬프트를 만든다.
4. ChatOpenAI를 호출한다.
5. JsonOutputParser로 구조화된 결과를 받는다.
6. 결과를 ai_analysis_results 테이블에 저장한다.
```

Agent가 반환하는 핵심 값은 다음입니다.

```json
{
  "inquiry_type": "bug",
  "urgency": "medium",
  "answer_draft": "담당자 답변 초안",
  "suggested_action": "github_issue_recommended"
}
```

`suggested_action`은 세 가지 방향으로 이해하면 됩니다.

- `answer_only`: 담당자가 댓글로 답변하면 되는 문의
- `needs_human_review`: AI가 판단하기 어려워 담당자 검토가 필요한 문의
- `github_issue_recommended`: 개발 작업 또는 버그로 GitHub Issue 등록이 필요한 문의

### 4.4 MCP 구현

1. `ai-server/ai-inquiry-rag-server/app/services/mcp_service.py`

이 프로젝트에서 MCP는 외부 시스템 호출 계층으로 이해하면 됩니다.
현재 목표는 GitHub Issue 생성입니다.

```text
Agent 판단
  -> github_issue_recommended
  -> 담당자 승인 또는 자동 생성 조건 확인
  -> MCP 서비스가 GitHub API 호출
  -> 실행 결과를 mcp_execution_logs에 저장
```

실제 운영 관점에서는 MCP 호출에 다음 개념이 필요합니다.

- 외부 API Key 또는 Token 관리
- 어떤 도구를 호출할지 선택하는 기준
- 호출 성공과 실패 로그 저장
- 무한 재시도 방지
- 권한이 있는 사용자만 실행 가능하도록 보호

## 5. 데이터베이스 구조

DB는 `infra/postgres-pgvector`의 Docker Compose로 실행하는 PostgreSQL 하나를
공유합니다. 같은 PostgreSQL 안에 일반 게시판 테이블과 AI 처리 테이블이
함께 존재합니다.

```text
users
posts
comments
tags
post_tags

inquiries
ai_analysis_results
mcp_execution_logs

langchain_pg_collection
langchain_pg_embedding
```

앞의 다섯 개는 게시판 도메인이고, 가운데 세 개는 AI 문의 처리 이력입니다.
마지막 두 개는 LangChain PGVector가 사용하는 컬렉션과 임베딩 저장 테이블입니다.

중요한 점은 PostgreSQL과 pgvector가 별도 DB가 아니라는 것입니다.

```text
PostgreSQL = 관계형 DB 엔진
pgvector = PostgreSQL 안에서 벡터 타입과 유사도 검색을 가능하게 하는 확장
```

따라서 하나의 컨테이너에서 PostgreSQL과 pgvector를 같이 사용하는 것이
자연스럽습니다. `pgvector/pgvector:pg16` 이미지는 PostgreSQL에 pgvector
확장이 포함된 이미지입니다.

## 6. 실행 순서

개발 환경에서는 보통 아래 순서로 실행합니다.

### 6.1 PostgreSQL + pgvector

```bash
cd infra/postgres-pgvector
docker compose up -d
```

DB 확인 SQL:

```sql
select current_database(), current_schema();

select schemaname, tablename
from pg_tables
where schemaname not in ('pg_catalog', 'information_schema')
order by schemaname, tablename;
```

### 6.2 FastAPI AI 서버

```bash
cd ai-server/ai-inquiry-rag-server
./.venv/bin/uvicorn app.main:app --reload --port 8000
```

AI 서버가 실행되어야 관리자 AI 검토가 동작합니다.

### 6.3 NestJS 서버

```bash
cd server/basic-server
pnpm start:dev
```

NestJS 서버는 게시판 API와 FastAPI AI 서버 호출을 담당합니다.

### 6.4 React 클라이언트

```bash
cd client/basic-client
pnpm dev
```

## 7. 대표 사용자 시나리오

### 7.1 일반 사용자

```text
1. 회원가입한다.
2. 로그인한다.
3. 게시판에 문의성 게시글을 작성한다.
4. 담당자의 댓글 답변을 기다린다.
```

일반 사용자는 AI 검토 버튼을 볼 수 없습니다.

### 7.2 관리자

```text
1. 일반 회원가입으로 계정을 만든다.
2. DB에서 role을 MANAGER로 변경한다.
3. 다시 로그인한다.
4. 게시글 상세 페이지로 이동한다.
5. AI 검토 실행 버튼을 누른다.
6. RAG 참고 문서, Agent 판단, 담당자 답변 추천을 확인한다.
7. GitHub Issue 등록 결과가 있으면 확인한다.
8. 추천 답변을 참고해 댓글을 작성한다.
```

## 8. 핵심 개념 정리

### 8.1 RAG

RAG는 Retrieval-Augmented Generation의 약자입니다. LLM이 답변하기 전에
내부 문서나 과거 문의를 먼저 검색하고, 검색 결과를 프롬프트에 넣어 답변
근거로 사용하게 하는 구조입니다.

이 프로젝트에서는 게시글 문의와 유사한 과거 문의 또는 문서를 검색해서
담당자 답변 초안에 반영합니다.

### 8.2 LangChain

LangChain은 LLM, Embedding, Vector Store, Prompt, Parser를 연결하는
프레임워크입니다.

이 프로젝트에서 LangChain이 쓰이는 부분:

- `OpenAIEmbeddings`
- `RecursiveCharacterTextSplitter`
- `PGVector`
- `ChatPromptTemplate`
- `ChatOpenAI`
- `JsonOutputParser`

### 8.3 pgvector

pgvector는 PostgreSQL에서 벡터 데이터를 저장하고 유사도 검색을 할 수 있게
해주는 확장입니다. 별도 Vector DB를 새로 띄우지 않아도 PostgreSQL 안에서
게시판 데이터와 AI 검색 데이터를 함께 관리할 수 있습니다.

### 8.4 Agent

Agent는 단순히 답변만 생성하는 코드가 아니라, 현재 상황을 보고 어떤 처리를
할지 판단하는 계층입니다.

이 프로젝트의 Agent는 다음 질문에 답합니다.

- 이 문의는 버그인가, 기능 요청인가, 단순 질문인가?
- 긴급도는 낮은가, 중간인가, 높은가?
- 담당자가 댓글로 답하면 되는가?
- GitHub Issue로 등록해야 하는가?

### 8.5 MCP

MCP는 LLM 또는 Agent가 외부 시스템을 호출할 수 있도록 만드는 도구 호출
계층입니다. 현재 프로젝트에서는 GitHub Issue 생성을 외부 시스템 연동
예시로 사용합니다.

## 9. 공부할 때 확인할 질문

아래 질문에 스스로 답할 수 있으면 전체 구조를 꽤 잘 이해한 것입니다.

- 일반 사용자는 왜 AI 검토 버튼을 볼 수 없는가?
- `MANAGER` 권한은 어디에서 확인하는가?
- 게시글은 어떤 과정을 거쳐 AI 문의로 변환되는가?
- NestJS가 AI 분석을 직접 하지 않고 FastAPI에 위임하는 이유는 무엇인가?
- FastAPI는 어떤 테이블에 문의와 분석 결과를 저장하는가?
- LangChain PGVector가 생성하는 테이블은 무엇인가?
- RAG 검색 결과는 Agent 프롬프트에 어떻게 들어가는가?
- `github_issue_recommended`가 나오면 어떤 코드가 실행되는가?
- PostgreSQL과 pgvector를 같은 컨테이너에서 쓰는 이유는 무엇인가?
- DBeaver에서 테이블이 안 보이면 어떤 DB와 schema를 확인해야 하는가?

## 10. 다음 개선 아이디어

현재 구현은 과제 요구사항을 반영한 기본 뼈대에 가깝습니다. 이후 개선한다면
아래 순서가 좋습니다.

- 관리자 화면에서 GitHub Issue 자동 생성 여부를 직접 승인하도록 변경
- AI 답변 초안을 댓글 입력창에 자동으로 채워 넣는 기능 추가
- RAG 문서 적재 상태를 관리자 화면에서 확인하는 기능 추가
- LangGraph로 Agent 상태와 도구 호출 루프를 명시적으로 구성
- AI 분석 결과와 원본 게시글을 더 강하게 연결하는 UI 추가
- 운영 환경에서는 TypeORM `synchronize: true`를 migration 기반으로 변경
- API Key와 Token 권한 범위, 회전 정책, 접근 제어 정책 문서화

