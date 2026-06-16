# 05. PostgreSQL/pgvector 평가

## 1. 평가 대상

이 프로젝트는 일반 게시판 데이터와 AI 처리 데이터를 같은 PostgreSQL에
저장합니다. pgvector는 PostgreSQL 안에서 벡터 검색을 가능하게 하는 확장입니다.

관련 위치:

```text
infra/postgres-pgvector/docker-compose.yml
infra/postgres-pgvector/init/001_schema.sql
server/basic-server/src/config/typeorm.config.ts
ai-server/ai-inquiry-rag-server/app/rag/vector_store.py
```

## 2. 테이블 분류

### 게시판 도메인

```text
users
posts
comments
tags
post_tags
```

### AI 문의 처리 도메인

```text
inquiries
ai_analysis_results
mcp_execution_logs
```

### LangChain PGVector 도메인

```text
langchain_pg_collection
langchain_pg_embedding
```

## 3. DBeaver 확인 SQL

```sql
select current_database(), current_schema();

select schemaname, tablename
from pg_tables
where schemaname not in ('pg_catalog', 'information_schema')
order by schemaname, tablename;
```

기대:

```text
current_database = inquiry_rag
current_schema = public
```

## 4. pgvector 확장 확인

```sql
select extname
from pg_extension
where extname = 'vector';
```

결과가 없으면 pgvector 확장이 활성화되지 않은 것입니다.

## 5. RAG 데이터 확인

```sql
select name
from langchain_pg_collection;

select count(*)
from langchain_pg_embedding;
```

`langchain_pg_embedding`의 count가 0이면 RAG 검색에 사용할 문서가 아직
적재되지 않은 상태입니다.

## 6. 성능 관점 체크

| 항목 | 확인 |
| --- | --- |
| 게시글 목록 조회 | 페이지네이션이 적용되는가 |
| 검색 | `ILIKE` 검색의 한계를 설명할 수 있는가 |
| RAG 검색 | embedding row 수가 늘어날 때 검색 시간이 어떻게 변하는가 |
| 데이터 정합성 | 게시글과 inquiries가 `post_id`로 연결되는가 |
| 운영 스키마 | TypeORM migration 전략이 있는가 |

## 7. 운영 개선 아이디어

- 게시글 검색에는 full-text search 또는 별도 검색 인덱스를 고려한다.
- pgvector 검색에는 데이터가 많아지면 HNSW 또는 IVFFlat 인덱스를 고려한다.
- 운영에서는 TypeORM `synchronize: true`를 사용하지 않는다.
- migration 파일로 스키마 변경을 추적한다.
- AI 분석 결과와 MCP 실행 로그는 감사 로그처럼 보존 정책을 정한다.

