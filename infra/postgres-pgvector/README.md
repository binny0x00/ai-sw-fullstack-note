# PostgreSQL + pgvector

공유 데이터베이스 컨테이너 설정입니다.

이 DB는 `basic-server`와 `ai-inquiry-rag-server`가 함께 사용합니다.

## 구성

```text
infra/postgres-pgvector/
├── docker-compose.yml
└── init/
    └── 001_schema.sql
```

## 포함 기능

- PostgreSQL 16
- pgvector extension
- FastAPI AI 서버가 사용하는 문의/분석/MCP 로그 테이블
- LangChain PGVector가 사용할 `vector` extension

LangChain PGVector의 실제 벡터 테이블은 문서 적재 시 자동 생성됩니다.

```text
langchain_pg_collection
langchain_pg_embedding
```

## 실행

```bash
cd infra/postgres-pgvector
docker compose up -d
```

## 초기화

주의: 아래 명령은 회원, 게시글, 댓글, AI 분석 로그, RAG 벡터 데이터를 모두
삭제합니다.

```bash
cd infra/postgres-pgvector
docker compose down -v
docker compose up -d
```

## 연결 예시

`server/basic-server/.env.example`

```text
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=inquiry_rag
```

`ai-server/ai-inquiry-rag-server/.env.example`

```text
DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/inquiry_rag"
```
