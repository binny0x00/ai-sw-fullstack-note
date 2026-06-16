# AI Inquiry RAG Server

FastAPI, LangChain, PostgreSQL, pgvector를 사용해 문의 처리 관리자 시스템의 기본 흐름을 구현한 학습용 서버입니다.

## 핵심 흐름

```text
문의 등록
-> AI Agent 분석
-> RAG로 관련 문서 검색
-> MCP tool로 GitHub Issue 조회
-> 답변 초안 생성
-> GitHub Issue 생성 제안
-> 관리자 승인 후 MCP tool로 GitHub Issue 생성 및 Projects 등록
-> RAG 검색, MCP 호출, Agent 단계, API 응답 시간 로그 저장
```

## 설치

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

`.env`의 `GITHUB_TOKEN`에는 Issues와 Projects 쓰기 권한이 있는 GitHub 토큰을 넣습니다.
`GITHUB_PROJECT_TITLE`은 MCP tool이 생성된 Issue를 추가할 GitHub Projects 보드 이름입니다.

## PostgreSQL 실행

```bash
cd ../../infra/postgres-pgvector
docker compose up -d
cd ../../ai-server/ai-inquiry-rag-server
```

## 문서 적재

```bash
python scripts/ingest_docs.py
```

문서는 LangChain `Document`로 변환되고, `RecursiveCharacterTextSplitter`로
chunk를 나눈 뒤, `langchain-postgres`의 `PGVector` VectorStore에 저장됩니다.
VectorStore는 `langchain_pg_collection`, `langchain_pg_embedding` 테이블을
사용합니다.

게시판 게시글은 NestJS에서 생성/수정/삭제될 때 FastAPI `/rag/posts`
endpoint로 동기화됩니다. 게시글은 `post:{id}` source metadata를 가진
chunk로 저장되며, 수정 시 기존 chunk를 삭제한 뒤 다시 저장합니다.

## 서버 실행

```bash
uvicorn app.main:app --reload
```

## 주요 API

- `GET /health`: 상태 확인
- `POST /inquiries`: 문의 등록
- `GET /inquiries`: 문의 목록
- `GET /inquiries/{inquiry_id}`: 문의 상세
- `POST /rag/search`: 관련 문서 검색
- `GET /rag/status`: RAG 문서와 embedding 적재 상태 확인
- `POST /rag/posts`: 게시글 생성/수정 시 RAG embedding 자동 저장
- `DELETE /rag/posts/{post_id}`: 게시글 삭제 시 RAG embedding 제거
- `GET /admin/observability`: API 응답 시간, LLM 호출 시간, 실패율, 최근 Agent 단계 확인
- `POST /inquiries/{inquiry_id}/analyze`: AI 분석 및 답변 초안 생성
- `POST /inquiries/{inquiry_id}/github-issue`: 관리자 승인 후 MCP tool 호출, GitHub Issue 생성, Projects 등록, 실행 로그 저장

## 설계 포인트

- RAG는 LangChain `PGVector` retriever 흐름으로 문서를 검색하고, 근거 기반 답변까지만 담당합니다.
- Agent는 LangGraph state와 node/edge로 RAG 검색, MCP 조회, LLM 답변 생성, 분석 저장 단계를 명시합니다.
- MCP는 외부 도구 실행 경계입니다. FastAPI는 MCP client로 `scripts/github_mcp_server.py`의 `search_github_issues`, `create_github_issue_with_project` tool을 호출합니다.
- pgvector에는 LangChain PGVector 스키마로 chunk embedding과 source metadata를 함께 저장합니다.
- 관리자 화면에서 API 응답 시간, LLM 호출 시간, 실패율, 최근 Agent 단계를 확인할 수 있도록 AI 기능의 실행 과정을 관찰 가능하게 설계했습니다.
