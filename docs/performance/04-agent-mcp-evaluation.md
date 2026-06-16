# 04. Agent와 MCP 평가

## 1. 평가 대상

Agent는 게시글과 댓글 대화를 보고 처리 방향을 판단합니다. MCP는 Agent 판단
이후 외부 시스템인 GitHub Issue 생성을 실행합니다.

관련 코드:

```text
ai-server/ai-inquiry-rag-server/app/services/agent_service.py
ai-server/ai-inquiry-rag-server/app/services/mcp_service.py
ai-server/ai-inquiry-rag-server/scripts/github_mcp_server.py
server/basic-server/src/posts/posts.service.ts
server/basic-server/src/inquiries/inquiries.service.ts
client/basic-client/src/pages/BoardDetailPage.tsx
```

## 2. Agent 평가 기준

Agent는 다음 네 가지를 반환해야 합니다.

```json
{
  "inquiry_type": "bug",
  "urgency": "medium",
  "answer_draft": "담당자 답변 초안",
  "suggested_action": "github_issue_recommended"
}
```

### inquiry_type 기준

| 값 | 의미 |
| --- | --- |
| `bug` | 재현 가능한 오류, 장애, 의도와 다른 동작 |
| `feature_request` | 새 기능 또는 개선 요청 |
| `question` | 사용법 질문 |
| `account` | 계정, 로그인, 인증 관련 문의 |
| `other` | 분류하기 어려운 문의 |

### suggested_action 기준

| 값 | 의미 |
| --- | --- |
| `answer_only` | 담당자가 댓글로 답하면 충분함 |
| `needs_human_review` | 담당자 확인이 필요함 |
| `github_issue_recommended` | 개발 작업으로 등록하는 것이 적절함 |

## 3. 테스트 시나리오

### 3.1 단순 사용 문의

입력:

```text
게시글 작성 시 태그는 어떻게 입력하나요?
```

기대:

```text
inquiry_type: question
suggested_action: answer_only
```

### 3.2 버그 문의

입력:

```text
로그인 버튼을 눌러도 아무 반응이 없고 브라우저 콘솔에 CORS 에러가 납니다.
```

기대:

```text
inquiry_type: bug 또는 account
suggested_action: github_issue_recommended 또는 needs_human_review
```

### 3.3 기능 요청

입력:

```text
매번 로그인하기 번거로우니 자동 로그인 기능을 추가해 주세요.
```

기대:

```text
inquiry_type: feature_request
suggested_action: github_issue_recommended
```

## 4. MCP 평가 기준

GitHub Issue 생성은 자동으로 실행되면 안 됩니다. 관리자 화면에서 승인 버튼을
눌렀을 때만 실행되어야 합니다.

확인 항목:

- AI 검토만 실행했을 때 GitHub Issue가 생성되지 않는가?
- `suggested_action`이 `github_issue_recommended`일 때 승인 버튼이 보이는가?
- 승인 버튼을 누르면 MCP 실행 로그가 저장되는가?
- GitHub Token이 없거나 잘못되었을 때 실패 로그가 남는가?
- 같은 문의에 대해 중복 생성 방지 전략이 필요한지 설명할 수 있는가?

## 5. 결과 기록 양식

| 테스트 | Agent 판단 | 기대 판단 | 일치 여부 | MCP 실행 | 평가 |
| --- | --- | --- | --- | --- | --- |
| 단순 사용 문의 |  |  |  |  |  |
| 버그 문의 |  |  |  |  |  |
| 기능 요청 |  |  |  |  |  |

## 6. 안정성 평가

Agent/MCP 기능은 외부 API 의존성이 있으므로 다음 실패 케이스를 확인합니다.

- OpenAI API Key 없음
- OpenAI API 응답 실패
- RAG 문서 미적재
- GitHub Token 없음
- GitHub repository 이름 오류
- MCP 서버 실행 실패

각 실패 케이스에서 시스템이 완전히 중단되지 않고, 관리자에게 원인을 추정할
수 있는 오류를 보여주는지 확인합니다.

