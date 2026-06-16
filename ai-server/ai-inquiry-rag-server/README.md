# AI Inquiry RAG Server

FastAPI, PostgreSQL, pgvector를 사용해 문의 처리 관리자 시스템의 기본 흐름을 구현한 학습용 서버입니다.

## 핵심 흐름

```text
문의 등록
-> AI Agent 분석
-> RAG로 관련 문서 검색
-> 답변 초안 생성
-> GitHub Issue 생성 제안
-> 관리자 승인 후 MCP 실행 로그 저장
```

## 설치

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

## PostgreSQL 실행

```bash
docker compose up -d
```

## 문서 적재

```bash
python scripts/ingest_docs.py
```

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
- `POST /inquiries/{inquiry_id}/analyze`: AI 분석 및 답변 초안 생성
- `POST /inquiries/{inquiry_id}/github-issue`: 관리자 승인 후 GitHub Issue 생성 로그 저장

## 설계 포인트

- RAG는 문서 검색과 근거 기반 답변까지만 담당합니다.
- Agent는 문의 유형, 긴급도, 외부 액션 필요 여부를 판단합니다.
- MCP는 외부 도구 실행 경계입니다. 예제에서는 GitHub Issue 생성 요청을 로그로 남기는 기본 구조를 제공합니다.
- pgvector에는 chunk embedding과 source metadata를 함께 저장합니다.

