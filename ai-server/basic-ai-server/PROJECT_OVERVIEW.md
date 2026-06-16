# AI 기반 문의 처리 관리자 시스템 개요

## 1. 주제

사용자의 문의를 AI Agent가 분석하고, RAG로 관련 문서와 과거 사례를
검색한 뒤, 필요 시 MCP를 통해 GitHub Issue를 생성하는 AI 기반 문의 처리
관리자 시스템입니다.

## 2. 목표

이 프로젝트의 목표는 RAG, MCP, AI Agent가 각각 어떤 역할을 하며 하나의
문의 처리 사이클로 어떻게 연결되는지 학습하는 것입니다.

특히 아래 세 가지 개념을 명확하게 구분해서 구현합니다.

- **AI Agent**: 문의를 분석하고 다음 행동을 판단하는 주체
- **RAG**: FAQ, API 문서, 과거 문의 등에서 관련 근거를 검색하는 기능
- **MCP**: GitHub Issue 생성 등 외부 도구를 실행하는 연결 방식

## 3. 전체 흐름

```text
사용자가 문의 작성
  ↓
AI Agent가 문의 유형 판단
  ↓
RAG로 관련 문서 / FAQ / 과거 문의 검색
  ↓
AI가 답변 초안과 처리 방안 생성
  ↓
필요하면 MCP로 GitHub Issue 생성 제안
  ↓
관리자가 검토 후 승인
  ↓
외부 액션 실행 및 결과 저장
```

## 4. 예시 시나리오

### 사용자 문의

```text
로그인 버튼을 눌러도 아무 반응이 없어요.
크롬 개발자 도구에는 CORS 에러가 떠요.
```

### AI Agent 판단

```text
문의 유형: 버그
관련 기능: 로그인
긴급도: 보통
RAG 검색 필요 여부: 필요
외부 액션 필요 여부: GitHub Issue 생성 권장
```

### RAG 검색 결과

```text
참고 문서:
- cors-error.md
- auth-login-api.md
- past-login-issue-001.md
```

### AI 답변 초안

```text
문의 내용을 확인한 결과, 프론트엔드에서 백엔드 API를 호출할 때 CORS 설정이
누락되어 발생한 문제일 가능성이 있습니다.

개발 환경에서는 NestJS main.ts에서 app.enableCors()를 설정하고,
프론트엔드 주소인 http://localhost:5173을 허용해야 합니다.
```

### MCP 실행 결과

```text
GitHub Issue 생성 완료

제목:
[Bug] 로그인 버튼 클릭 시 CORS 에러 발생

본문:
- 문의 유형: 버그
- 관련 기능: 로그인
- 사용자 증상: 로그인 버튼 클릭 후 반응 없음
- 확인된 에러: CORS
- 참고 문서: cors-error.md, auth-login-api.md
```

## 5. RAG의 역할

RAG는 AI가 답변을 만들 때 사용할 근거 문서를 찾아주는 역할을 합니다.

이 프로젝트에서 RAG가 검색할 수 있는 데이터는 다음과 같습니다.

```text
FAQ 문서
API 문서
과거 문의 데이터
운영 매뉴얼
장애 대응 기록
```

직접 작성할 수 있는 문서 예시는 다음과 같습니다.

```text
docs/
  auth-login.md
  cors-error.md
  jwt-expired.md
  post-create-error.md
  post-pagination.md
  faq.md
```

LLM은 근거 없이 그럴듯한 답변을 만들 수 있습니다. RAG를 사용하면 내부
문서나 과거 사례를 기반으로 답변을 만들 수 있기 때문에 답변의 신뢰도를
높일 수 있습니다.

### RAG 처리 흐름

```text
문서 작성
  ↓
문서를 chunk 단위로 분리
  ↓
embedding 생성
  ↓
pgvector에 저장
  ↓
사용자 문의와 유사한 chunk 검색
  ↓
검색 결과를 LLM에게 함께 전달
  ↓
근거 기반 답변 생성
```

## 6. MCP의 역할

MCP는 AI Agent가 외부 시스템이나 도구를 사용할 수 있게 해주는 연결
방식입니다.

이 프로젝트에서는 MCP를 통해 다음 작업을 실행할 수 있습니다.

```text
GitHub Issue 생성
Slack 알림 전송
Notion 문서 생성
Trello 카드 생성
파일 시스템 접근
```

연습용 프로젝트에서는 처음부터 복잡하게 만들 필요 없이 GitHub Issue 생성
하나만 구현해도 충분합니다.

### MCP 예시

AI Agent가 문의를 분석한 뒤 아래처럼 판단합니다.

```text
이 문의는 실제 버그 가능성이 있으므로 GitHub Issue 생성이 필요합니다.
```

관리자가 승인 버튼을 누르면 MCP를 통해 GitHub Issue가 생성됩니다.

```text
제목:
[Bug] 로그인 버튼 클릭 시 반응 없음

본문:
- 문의 유형: 버그
- 관련 기능: 로그인
- 사용자 증상: 로그인 버튼 클릭 후 반응 없음
- 관련 근거: CORS 에러 문서, 로그인 API 문서
- 재현 절차:
  1. 로그인 페이지 접속
  2. 이메일 / 비밀번호 입력
  3. 로그인 버튼 클릭
  4. 응답 없음
```

## 7. AI Agent의 역할

AI Agent는 전체 흐름을 판단하고 제어하는 역할을 합니다.

이 프로젝트에서 Agent는 다음을 판단합니다.

```text
문의 유형은 무엇인가?
- 버그
- 기능 요청
- 사용 문의
- 계정 문제
- 기타

긴급도는 어느 정도인가?
- 낮음
- 보통
- 높음

RAG 검색이 필요한가?
- 필요함
- 필요 없음

외부 액션이 필요한가?
- GitHub Issue 생성 필요
- 단순 답변만 필요
- 관리자 검토 필요
```

### Agent 처리 흐름

```text
문의 입력
  ↓
문의 유형 분류
  ↓
긴급도 판단
  ↓
RAG 검색 여부 판단
  ↓
검색 결과 기반 답변 초안 생성
  ↓
MCP 액션 필요 여부 판단
  ↓
최종 처리안 생성
```

## 8. MVP 기능 범위

초보자도 구현을 따라갈 수 있으면서 RAG, MCP, Agent의 핵심 사이클을
보여주기 위한 최소 기능은 다음과 같습니다.

```text
1. 문의 등록
2. 문의 목록 조회
3. 문의 상세 조회
4. AI 분석 요청
5. RAG 기반 관련 문서 검색
6. 답변 초안 생성
7. GitHub Issue 생성 제안
8. 관리자 승인 후 GitHub Issue 생성
9. AI 분석 결과 저장
10. MCP 실행 로그 저장
```

## 9. 화면 구성

### 문의 목록 페이지

```text
- 문의 제목
- 문의 유형
- AI 분석 상태
- 긴급도
- GitHub Issue 생성 여부
```

### 문의 상세 페이지

```text
- 사용자 문의 내용
- AI Agent 판단 결과
- RAG로 찾은 관련 문서
- AI 답변 초안
- 추천 액션
- 답변 승인 버튼
- GitHub Issue 생성 버튼
- MCP 실행 결과
```

### 화면에서 구분해야 할 영역

```text
AI Agent 판단 결과
- 유형: 버그
- 긴급도: 보통
- 추천 액션: GitHub Issue 생성

RAG 검색 결과
- CORS 에러 해결 문서
- 로그인 API 명세
- 과거 유사 문의 2건

MCP 실행 결과
- GitHub Issue 생성 완료
```

이렇게 UI를 나누면 보는 사람이 RAG, MCP, Agent의 역할을 쉽게 이해할 수
있습니다.

## 10. 기술 구조

```text
React
  ↓
NestJS
  ↓
FastAPI AI Server
  ├─ AI Agent
  ├─ RAG
  ├─ MCP Client / Tool Wrapper
  └─ LLM 호출
  ↓
PostgreSQL + pgvector
```

## 11. 역할 분리

### React

```text
관리자 화면
문의 등록 / 조회
AI 분석 결과 확인
GitHub Issue 생성 버튼
```

### NestJS

```text
문의 CRUD
회원 / 관리자 구조
AI 분석 요청 API
AI 결과 저장
FastAPI 호출
```

### FastAPI

```text
문의 분석
RAG 검색
답변 초안 생성
Agent 판단
GitHub Issue 생성 도구 호출
LLM 연동
Embedding 생성
pgvector 검색
```

### PostgreSQL

```text
users
inquiries
ai_analysis_results
documents
document_chunks
github_issue_logs
```

### pgvector

```text
document_chunks.embedding
```

## 12. 데이터 예시

외부 크롤링 없이 직접 작성할 수 있는 데이터로 시작합니다.

### FAQ 문서 예시

```text
FAQ: CORS 에러가 발생하는 경우

증상:
프론트엔드에서 백엔드 API를 호출할 때
No 'Access-Control-Allow-Origin' header 에러가 발생한다.

원인:
백엔드 서버에서 CORS 설정이 되어 있지 않거나,
허용 origin에 프론트엔드 주소가 포함되어 있지 않을 수 있다.

해결:
NestJS main.ts에서 app.enableCors()를 설정한다.
개발 환경에서는 http://localhost:5173을 허용한다.
```

### API 문서 예시

```text
API: 로그인

Endpoint:
POST /auth/login

Request:
email, password

Response:
accessToken, user

주요 에러:
401 Unauthorized - 이메일 또는 비밀번호가 올바르지 않음
500 Internal Server Error - 서버 내부 오류
```

### 과거 문의 데이터 예시

```text
제목:
로그인 버튼 클릭 후 반응이 없습니다.

내용:
로그인 폼에 이메일과 비밀번호를 입력하고 버튼을 눌렀는데
아무 반응이 없습니다. 콘솔에는 CORS 관련 에러가 보입니다.

처리 결과:
백엔드 CORS 설정 누락 문제로 확인되었습니다.
main.ts에 app.enableCors 설정을 추가했습니다.
```

## 13. 전문가가 봐도 중요한 요소

단순히 LLM으로 답변만 생성하면 AI 챗봇에 가깝습니다. Agent 기반
시스템처럼 보이려면 아래 요소들을 포함하는 것이 좋습니다.

### Agent Decision Log

AI가 왜 그런 판단을 했는지 기록합니다.

```json
{
  "type": "bug",
  "priority": "medium",
  "needs_rag": true,
  "needs_external_action": true,
  "recommended_action": "create_github_issue"
}
```

### RAG Source Citation

답변 초안에 어떤 문서를 참고했는지 보여줍니다.

```json
{
  "answer_draft": "CORS 설정 문제일 가능성이 높습니다...",
  "sources": [
    "cors-error.md",
    "auth-login-api.md",
    "past-login-issue-001.md"
  ]
}
```

### Human-in-the-loop

AI가 바로 실행하지 않고 관리자가 승인하게 합니다.

```text
AI 추천
  ↓
관리자 검토
  ↓
실행
```

GitHub Issue 생성 같은 외부 액션은 자동 실행보다 승인 단계를 두는 것이
안전합니다.

### Tool Execution Log

MCP가 실행한 결과를 기록합니다.

```json
{
  "tool": "github.create_issue",
  "status": "success",
  "external_url": "https://github.com/..."
}
```

### 실패 처리

외부 도구 호출이 실패했을 때도 기록합니다.

```json
{
  "tool": "github.create_issue",
  "status": "failed",
  "error_message": "GitHub token is missing"
}
```

## 14. 핵심 학습 포인트

이 프로젝트를 통해 학습할 수 있는 것은 다음과 같습니다.

```text
RAG는 내부 문서와 과거 데이터를 검색해서 답변의 근거를 제공한다.

MCP는 AI가 외부 시스템을 사용할 수 있게 해주는 도구 연결 방식이다.

AI Agent는 문의를 분석하고, RAG와 MCP를 언제 사용할지 판단한다.

Human-in-the-loop 구조는 AI가 만든 결과를 사람이 검토하고 승인하는
안전장치다.

Tool execution log는 AI가 어떤 외부 도구를 실행했는지 추적하기 위한
기록이다.
```

## 15. 최종 정리

이 프로젝트는 RAG, MCP, AI Agent를 각각 따로 구현하는 것이 아니라, 하나의
문의 처리 사이클 안에서 연결해 보여주는 연습용 프로젝트입니다.

```text
AI Agent = 무엇을 할지 판단하는 주체
RAG = 필요한 지식을 찾아오는 방식
MCP = 외부 도구를 실행하는 연결 방식
```

최종적으로는 아래 구조를 목표로 합니다.

```text
문의 접수
  ↓
Agent 판단
  ↓
RAG 근거 검색
  ↓
답변 초안 생성
  ↓
MCP 외부 액션 제안
  ↓
관리자 승인
  ↓
GitHub Issue 생성
```
