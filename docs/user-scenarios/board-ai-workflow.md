# 게시판 AI 검토 사용자 시나리오

## 1. 시나리오 개요

이 프로젝트의 핵심 사용자 시나리오는 게시판에 올라온 문의성 게시글을
AI가 검토하고, 담당자가 댓글로 답변할 사안인지 GitHub Issue로 등록해야
하는 개발 작업인지 판단하는 흐름입니다.

게시글 자체는 일반 게시판 기능으로 작성되지만, 게시글 상세 화면에서
담당자가 AI 검토를 실행하면 RAG, Agent, MCP가 순서대로 연결됩니다.
사용자가 별도의 AI 문의 처리 화면에 들어가는 구조가 아니라, 게시판에
작성된 게시글을 담당자가 처리하는 구조입니다.

```text
사용자 게시글 작성
  -> 담당자 게시글 상세 확인
  -> AI 담당자 검토 실행
  -> RAG로 과거 문의/문서 검색
  -> Agent가 답변 초안과 처리 방향 판단
  -> GitHub Issue 필요 시 MCP로 Issue 생성
  -> 담당자는 추천 답변을 참고해 댓글 작성
```

## 2. 주요 사용자

### 일반 사용자

- 회원가입과 로그인을 한다.
- 게시판에 문의성 게시글을 작성한다.
- 담당자의 댓글 답변을 확인한다.

### 담당자

- DB에서 `role`이 `MANAGER`로 변경된 사용자다.
- 게시글과 댓글 대화를 확인한다.
- AI 검토를 실행한다.
- AI가 추천한 답변 초안을 참고해 댓글을 작성한다.
- AI가 GitHub Issue 생성을 권장한 경우 생성 결과를 확인한다.

### AI Agent

- 게시글과 댓글 내용을 하나의 문의 컨텍스트로 해석한다.
- RAG 검색 결과를 참고해 이전에 비슷한 문의가 있었는지 확인한다.
- 단순 답변, 담당자 검토, GitHub Issue 생성 필요 여부를 판단한다.

## 3. 기본 게시판 시나리오

### 3.1 회원가입 및 로그인

```text
1. 사용자가 /signup 페이지로 이동한다.
2. 닉네임, 이메일, 비밀번호를 입력한다.
3. 회원가입 요청이 NestJS 서버로 전송된다.
4. 계정은 기본적으로 USER 권한으로 저장된다.
5. 사용자는 /login 페이지에서 로그인한다.
6. 로그인 성공 시 accessToken과 userRole이 localStorage에 저장된다.
```

관련 기능:

- React: `SignupPage`, `LoginPage`
- NestJS: `AuthController`, `AuthService`
- DB: `users`

### 3.2 게시글 작성

```text
1. 로그인한 사용자가 /board/write 페이지로 이동한다.
2. 제목, 내용, 태그를 입력한다.
3. 제출하면 NestJS의 POST /posts API가 호출된다.
4. 게시글과 태그가 PostgreSQL에 저장된다.
5. 사용자는 게시판 목록으로 이동한다.
```

관련 기능:

- React: `BoardWritePage`
- NestJS: `PostsController.create`
- DB: `posts`, `tags`, `post_tags`

### 3.3 댓글 작성

```text
1. 담당자 또는 사용자가 게시글 상세 페이지로 이동한다.
2. 댓글 입력창에 답변 또는 추가 정보를 작성한다.
3. POST /posts/:postId/comments API가 호출된다.
4. 댓글이 저장되고 화면에 다시 표시된다.
```

관련 기능:

- React: `BoardDetailPage`
- NestJS: `PostsController.createComment`
- DB: `comments`

## 4. AI 담당자 검토 시나리오

### 4.1 AI 검토 실행

```text
1. MANAGER 권한을 가진 담당자가 게시글 상세 페이지에서 "AI 검토 실행" 버튼을 누른다.
2. React가 POST /posts/:id/ai-review API를 호출한다.
3. NestJS가 JWT와 MANAGER 권한을 확인한다.
4. NestJS가 게시글, 태그, 댓글 대화를 조회한다.
5. NestJS가 게시글 내용을 AI 서버의 문의 형태로 변환한다.
6. 변환된 문의가 FastAPI AI 서버에 등록된다.
```

게시글은 아래와 같은 문의 컨텍스트로 변환됩니다.

```text
게시판에 등록된 문의성 게시글입니다.

## 게시글
제목: 로그인 버튼을 눌러도 반응이 없어요
작성자: user1
태그: #login #cors

로그인 버튼을 클릭해도 아무 반응이 없고 콘솔에 CORS 에러가 보입니다.

## 댓글 대화
- 담당자: 어떤 브라우저에서 발생하나요?
- 사용자: Chrome에서 발생합니다.

## AI 검토 기준
- 이전 문의와 유사하면 참고 문서를 근거로 담당자 답변 초안을 작성합니다.
- 실제 버그나 개발 조치가 필요하면 GitHub Issue 생성을 권장합니다.
- 단순 사용 문의면 담당자가 댓글로 답변할 수 있도록 안내합니다.
```

관련 기능:

- React: `BoardDetailPage.handleAiReview`
- NestJS: `PostsController.reviewWithAi`
- NestJS: `PostsService.reviewWithAi`
- FastAPI: `POST /inquiries`

주의: `/inquiries` API와 테이블은 AI 처리 이력 저장용 내부 도메인입니다.
일반 사용자가 직접 접근하는 화면은 제공하지 않습니다.

## 5. RAG 기반 답변 추천 시나리오

### 5.1 과거 문의 및 문서 검색

```text
1. FastAPI AI 서버가 게시글 제목과 본문을 검색 쿼리로 사용한다.
2. LangChain `OpenAIEmbeddings`가 쿼리 임베딩을 생성한다.
3. LangChain `PGVector`가 PostgreSQL pgvector에서 유사 문서를 검색한다.
4. 검색된 문서가 AI Agent 프롬프트의 참고 문서로 전달된다.
```

현재 RAG 데이터 소스:

- FAQ 문서
- 로그인 API 문서
- CORS 대응 문서
- JWT 만료 대응 문서
- 과거 로그인 문의 사례

사용 기술:

- LangChain `Document`
- LangChain `RecursiveCharacterTextSplitter`
- LangChain `OpenAIEmbeddings`
- LangChain Postgres `PGVector`
- PostgreSQL `pgvector`

### 5.2 담당자 답변 초안 생성

```text
1. Agent가 RAG 검색 결과를 근거로 답변 초안을 생성한다.
2. 이전 문의와 유사한 경우 참고 문서 목록을 함께 반환한다.
3. React 화면은 "담당자 답변 추천" 영역에 초안을 표시한다.
4. 담당자는 초안을 그대로 사용하거나 수정해 댓글로 답변한다.
```

예상 화면 결과:

```text
담당자 답변 추천:
문의 내용을 보면 프론트엔드에서 백엔드 API를 호출할 때 CORS 설정이
누락되어 발생한 문제일 가능성이 있습니다. 개발 환경에서는 NestJS
main.ts에서 app.enableCors()를 설정하고, 프론트엔드 주소인
http://localhost:5173을 허용해야 합니다.

RAG 참고 문의:
- cors-error.md
- auth-login-api.md
- past-login-issue-001.md
```

## 6. Agent 판단 시나리오

Agent는 RAG 검색 결과와 게시글 내용을 바탕으로 아래 값을 판단합니다.

```json
{
  "inquiry_type": "bug",
  "urgency": "medium",
  "answer_draft": "CORS 설정 문제일 가능성이 높습니다...",
  "suggested_action": "github_issue_recommended"
}
```

판단 기준:

- `answer_only`: 담당자가 댓글로 답변하면 되는 단순 문의
- `needs_human_review`: AI가 확정하기 어렵고 담당자 검토가 필요한 문의
- `github_issue_recommended`: 버그 또는 개발 작업으로 등록해야 하는 문의

현재 구현에서는 `github_issue_recommended`일 때 GitHub Issue 자동 등록을
시도합니다.

관련 기능:

- FastAPI: `AgentService.analyze`
- LangChain: `ChatPromptTemplate | ChatOpenAI | JsonOutputParser`
- 저장 테이블: `ai_analysis_results`

## 7. MCP 기반 GitHub Issue 등록 시나리오

### 7.1 GitHub Issue 등록 조건

```text
1. Agent의 suggested_action이 github_issue_recommended인지 확인한다.
2. 게시글 AI 검토 요청에서 autoCreateIssue가 false가 아니어야 한다.
3. 조건을 만족하면 NestJS가 FastAPI의 GitHub Issue 승인 API를 호출한다.
4. FastAPI는 MCP client로 GitHub MCP server tool을 호출한다.
5. MCP server가 GitHub REST API와 GraphQL API를 호출한다.
6. 생성 결과가 mcp_execution_logs에 저장된다.
```

관련 기능:

- NestJS: `InquiriesService.approveGithubIssue`
- FastAPI: `POST /inquiries/{inquiry_id}/github-issue`
- MCP server: `scripts/github_mcp_server.py`
- 외부 서비스: GitHub Issues, GitHub Projects
- 저장 테이블: `mcp_execution_logs`

### 7.2 GitHub Issue 본문 예시

```markdown
## 문의 내용

로그인 버튼을 클릭해도 아무 반응이 없고 콘솔에 CORS 에러가 보입니다.

## AI 분석 요약

CORS 설정 문제일 가능성이 높습니다...

## 메타데이터

- inquiry_id: 1
- inquiry_type: bug
- urgency: medium
- suggested_action: github_issue_recommended
- customer_email: user@example.com
```

## 8. 화면 기준 사용자 플로우

```text
/signup
  -> 회원가입

/login
  -> 로그인

/board
  -> 게시글 목록, 검색, 페이징

/board/write
  -> 게시글 작성

/board/:id
  -> 게시글 상세
  -> 댓글 작성
  -> MANAGER 권한 사용자에게만 AI 담당자 검토 표시
  -> AI 담당자 검토 실행
  -> Agent 판단 확인
  -> RAG 참고 문의 확인
  -> 담당자 답변 추천 확인
  -> GitHub Issue 등록 결과 확인
```

## 9. 성공 시나리오 예시

### 입력 게시글

```text
제목:
로그인 버튼을 눌러도 반응이 없어요

내용:
Chrome에서 로그인 버튼을 클릭해도 화면 변화가 없습니다.
개발자 도구 콘솔에는 CORS 에러가 표시됩니다.

태그:
login, cors
```

### AI 검토 결과

```text
문의 유형: bug
긴급도: medium
추천 액션: github_issue_recommended
RAG 참고 문서: cors-error.md, auth-login-api.md, past-login-issue-001.md
GitHub Issue: created
```

### 담당자 행동

```text
1. AI가 추천한 답변 초안을 확인한다.
2. GitHub Issue 생성 결과를 확인한다.
3. 게시글 댓글에 사용자 안내 답변을 남긴다.
4. 개발자는 GitHub Issue에서 실제 수정 작업을 진행한다.
```

## 10. 예외 시나리오

### AI 서버가 꺼져 있는 경우

```text
1. 담당자가 AI 검토 실행을 누른다.
2. NestJS가 FastAPI 호출에 실패한다.
3. React는 "AI 검토 실패" 메시지를 표시한다.
4. 담당자는 수동으로 댓글을 작성한다.
```

### GitHub 토큰이 없는 경우

```text
1. Agent는 GitHub Issue 생성을 권장한다.
2. MCP 실행 단계에서 GITHUB_TOKEN 누락으로 실패한다.
3. 실패 로그가 mcp_execution_logs에 저장된다.
4. 담당자는 로그를 확인하고 환경변수를 설정한 뒤 다시 시도한다.
```

### 이전 문의가 없는 경우

```text
1. RAG 검색 결과가 부족하거나 관련성이 낮다.
2. Agent는 needs_human_review 또는 answer_only를 반환할 수 있다.
3. 담당자가 직접 판단해 댓글 답변 또는 이슈 등록을 진행한다.
```

## 11. 현재 구현의 한계

- 게시글 작성 직후 자동 검토가 아니라 상세 화면에서 담당자가 버튼을 눌러야 한다.
- AI가 추천한 담당자 답변을 댓글 입력창에 자동 삽입하는 기능은 아직 없다.
- GitHub Issue 재시도 버튼은 별도로 구현되어 있지 않다.
- 게시글 자체를 RAG 데이터로 자동 적재하는 흐름은 아직 없다.
- Agent는 단일 판단 체인 기반이며 LangGraph 기반 명시적 추론 루프는 아직 아니다.

## 12. 개선 아이디어

- 게시글 작성 완료 후 자동으로 AI 검토 실행
- AI 답변 초안을 댓글 입력창에 "적용"하는 버튼 추가
- 게시글과 댓글을 주기적으로 RAG VectorStore에 적재
- `github_issue_recommended`일 때 담당자 승인 후 생성하는 모드 추가
- LangGraph로 `분류 -> RAG 검색 -> 답변 생성 -> 도구 실행 판단 -> MCP 실행`
  노드를 분리
- GitHub Issue 생성 실패 시 재시도 UI 추가
