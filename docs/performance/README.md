# 성능 평가 문서 모음

이 폴더는 AI 게시판 시스템의 성능과 품질을 평가하기 위한 기준, 시나리오,
체크리스트, 결과 기록 양식을 모아둔 공간입니다.

평가 대상은 단순 API 응답 속도만이 아닙니다. 이 프로젝트는 게시판, 인증,
RAG, Agent, MCP, PostgreSQL/pgvector가 연결된 시스템이므로 다음 관점으로
나누어 평가합니다.

- 게시판 API 성능
- React 화면 사용성
- RAG 검색 품질과 지연 시간
- Agent 판단 정확도와 안정성
- MCP GitHub Issue 생성 안정성
- PostgreSQL/pgvector 데이터 구조와 검색 성능
- 보안과 운영 준비도

## 문서 목록

| 문서 | 목적 |
| --- | --- |
| `01-evaluation-plan.md` | 전체 평가 계획과 성공 기준 |
| `02-api-performance.md` | NestJS 게시판 API 성능 평가 |
| `03-rag-evaluation.md` | LangChain RAG 검색 품질 평가 |
| `04-agent-mcp-evaluation.md` | Agent 판단과 MCP 실행 평가 |
| `05-database-pgvector-evaluation.md` | PostgreSQL/pgvector 평가 |
| `06-frontend-ux-evaluation.md` | React 화면 기능과 UX 평가 |
| `07-security-operations-evaluation.md` | 인증, 권한, 토큰, 운영 설정 평가 |
| `08-test-data.md` | 성능 평가용 테스트 데이터 |
| `09-result-report-template.md` | 제출용 성능 평가 결과 템플릿 |

## 권장 평가 순서

```text
1. DB와 서버 실행 상태 확인
2. 기본 게시판 API 성능 측정
3. RAG 문서 적재 상태 확인
4. RAG 검색 품질 평가
5. Agent 판단 결과 평가
6. GitHub Issue 승인/생성 흐름 평가
7. 관리자 화면 UX 평가
8. 보안/운영 체크리스트 점검
9. 결과 리포트 작성
```

## 평가 전 준비

필수 실행 대상:

```text
PostgreSQL + pgvector
FastAPI AI 서버
NestJS basic-server
React basic-client
```

주의:

- 실제 `.env` 내용은 평가 문서에 기록하지 않습니다.
- API Key, GitHub Token, DB 비밀번호는 결과 리포트에 절대 적지 않습니다.
- 외부 API 호출 성능은 네트워크와 모델 상태에 영향을 받을 수 있으므로,
  최소 3회 이상 반복 측정합니다.

