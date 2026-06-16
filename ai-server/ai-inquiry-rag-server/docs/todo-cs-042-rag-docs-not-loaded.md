# RAG 문서 미적재 문의

## 상황

관리자 화면에서 RAG 문서 또는 embedding 수가 0으로 표시된다.

## 확인 포인트

- `python scripts/ingest_docs.py`를 실행했는지 확인한다.
- OPENAI_API_KEY가 올바른지 확인한다.
- PostgreSQL pgvector 컨테이너가 실행 중인지 확인한다.

## 답변 가이드

문서 적재 스크립트를 실행해야 RAG 검색이 가능하다고 안내한다.

## 개발팀 전달 기준

스크립트 실행 후에도 0이면 vector store 연결 문제로 분류한다.
