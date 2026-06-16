# 09. 성능 평가 결과 리포트 템플릿

## 1. 평가 개요

평가 일시:

```text
YYYY-MM-DD HH:mm
```

평가 환경:

```text
OS:
Node.js:
Python:
PostgreSQL:
pgvector:
NestJS:
FastAPI:
React:
```

실행 서버:

```text
PostgreSQL + pgvector:
FastAPI AI server:
NestJS basic-server:
React basic-client:
```

## 2. 기능 평가 요약

| 영역 | 결과 | 비고 |
| --- | --- | --- |
| 회원가입/로그인 |  |  |
| 게시글 CRUD |  |  |
| 댓글 |  |  |
| 태그 |  |  |
| 검색/페이징 |  |  |
| 관리자 권한 |  |  |
| RAG 검색 |  |  |
| Agent 판단 |  |  |
| MCP GitHub Issue |  |  |

## 3. API 성능 결과

| API | 1회차 | 2회차 | 3회차 | 평균 | 평가 |
| --- | ---: | ---: | ---: | ---: | --- |
| `GET /posts` |  |  |  |  |  |
| `GET /posts/:id` |  |  |  |  |  |
| `POST /posts` |  |  |  |  |  |
| `POST /comments` |  |  |  |  |  |
| `POST /posts/:id/ai-review` |  |  |  |  |  |

## 4. RAG 평가 결과

| 질의 | Top-1 | Top-3 | 응답 시간 | 평가 |
| --- | --- | --- | ---: | --- |
| 로그인 CORS 오류 |  |  |  |  |
| JWT 만료 |  |  |  |  |
| 자동 로그인 요청 |  |  |  |  |
| 검색 개선 |  |  |  |  |

## 5. Agent 평가 결과

| 테스트 | 예상 판단 | 실제 판단 | 일치 여부 | 메모 |
| --- | --- | --- | --- | --- |
| 단순 질문 | `answer_only` |  |  |  |
| 버그 문의 | `github_issue_recommended` 또는 `needs_human_review` |  |  |  |
| 기능 요청 | `github_issue_recommended` |  |  |  |

## 6. MCP 평가 결과

| 항목 | 결과 | 메모 |
| --- | --- | --- |
| AI 검토만으로 Issue가 생성되지 않음 |  |  |
| 승인 버튼 클릭 후 Issue 생성 |  |  |
| 실패 시 로그 저장 |  |  |
| 실행 결과가 화면에 표시됨 |  |  |

## 7. DB 평가 결과

확인 SQL:

```sql
select current_database(), current_schema();

select schemaname, tablename
from pg_tables
where schemaname not in ('pg_catalog', 'information_schema')
order by schemaname, tablename;
```

확인 결과:

```text

```

## 8. 보안 평가 결과

| 항목 | 결과 |
| --- | --- |
| `.env` 미커밋 |  |
| 관리자 API 보호 |  |
| GitHub Token 최소 권한 설명 |  |
| 운영 migration 전략 |  |
| MCP 실행 로그 저장 |  |

## 9. 한계점

```text

```

## 10. 개선 아이디어

```text

```

