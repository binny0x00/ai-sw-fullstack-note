# 공유 PostgreSQL/pgvector 아키텍처

## 1. 결론

현재 프로젝트는 `basic-server`와 `ai-inquiry-rag-server`가 같은
PostgreSQL/pgvector 데이터베이스를 사용하도록 정리합니다.

폴더 구조는 크게 바꾸지 않습니다.

```text
client/basic-client
  React UI

server/basic-server
  NestJS 게시판/회원/권한/게시글 AI 검토 API

ai-server/ai-inquiry-rag-server
  FastAPI RAG/MCP/Agent 서버

infra/postgres-pgvector
  PostgreSQL(pgvector) docker-compose와 초기 SQL
```

공유 DB는 `infra/postgres-pgvector/docker-compose.yml`에 있는
`pgvector/pgvector:pg16` 컨테이너를 사용합니다.

## 2. 왜 같은 DB를 쓰는가

게시글, 댓글, AI 문의, RAG 검색 결과, MCP 실행 로그가 하나의 서비스
흐름으로 연결되기 때문입니다.

```text
게시글 작성
  -> 게시글 AI 검토
  -> 문의 row 생성
  -> AI 분석 row 생성
  -> GitHub Issue 필요 시 MCP 로그 row 생성
```

같은 DB를 쓰면 NestJS와 FastAPI가 같은 `inquiries`,
`ai_analysis_results`, `mcp_execution_logs` row를 공유할 수 있습니다.

## 3. DB 책임 분리

하나의 DB를 쓰더라도 테이블 책임은 나눕니다.

### NestJS가 주로 관리하는 테이블

```text
users
posts
comments
tags
post_tags
```

### FastAPI가 주로 관리하는 테이블

```text
inquiries
ai_analysis_results
mcp_execution_logs
```

### LangChain PGVector가 관리하는 테이블

```text
langchain_pg_collection
langchain_pg_embedding
```

## 4. 중요한 구현 원칙

같은 DB를 쓰기 때문에 같은 테이블에 대해 중복 저장을 하면 안 됩니다.

현재 구현 원칙은 아래와 같습니다.

```text
NestJS
  -> FastAPI에 문의 생성 요청
  -> FastAPI가 inquiries row 저장
  -> NestJS는 같은 DB에서 해당 row 조회

NestJS
  -> FastAPI에 AI 분석 요청
  -> FastAPI가 ai_analysis_results row 저장
  -> NestJS는 같은 DB에서 최신 분석 row 조회

NestJS
  -> FastAPI에 GitHub Issue 생성 요청
  -> FastAPI가 mcp_execution_logs row 저장
  -> NestJS는 같은 DB에서 최신 로그 row 조회
```

## 5. 설정 예시

실제 `.env` 값은 저장소에 커밋하지 않습니다. 아래는 예시입니다.

### `ai-server/ai-inquiry-rag-server/.env.example`

```text
DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/inquiry_rag"
```

### `server/basic-server/.env.example`

```text
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=inquiry_rag
AI_SERVER_BASE_URL=http://localhost:8000
```

## 6. 초기 실행 순서

```bash
cd infra/postgres-pgvector
docker compose up -d
cd ../../ai-server/ai-inquiry-rag-server
python scripts/init_db.py
python scripts/ingest_docs.py
```

```bash
cd server/basic-server
pnpm start:dev
```

```bash
cd client/basic-client
pnpm dev
```

## 7. 초기화가 필요한 경우

RAG 스키마, TypeORM 엔티티, FastAPI SQL 스키마를 크게 바꾼 직후에는
개발 DB를 초기화하는 편이 안전합니다.

```bash
cd infra/postgres-pgvector
docker compose down -v
docker compose up -d
cd ../../ai-server/ai-inquiry-rag-server
python scripts/init_db.py
python scripts/ingest_docs.py
```

주의: 같은 DB를 쓰므로 위 명령은 게시글, 회원, 댓글, AI 분석 로그도 모두
삭제합니다. 데모 데이터를 유지해야 한다면 실행하면 안 됩니다.

## 8. 폴더 구조를 바꾸지 않는 이유

DB를 공유한다고 해서 서버 폴더를 합칠 필요는 없습니다.

현재 구조는 역할 분리가 명확합니다.

```text
React: 화면
NestJS: 게시판/회원/권한/서비스 API
FastAPI: AI/RAG/MCP/Agent
PostgreSQL(pgvector): 공통 저장소
```

따라서 폴더 구조는 유지하고, 공유 DB 설정과 테이블 매핑만 맞추는 방식이
가장 단순합니다.
