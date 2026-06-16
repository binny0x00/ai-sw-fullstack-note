# GitHub Issue 생성 승인 문의

## 상황

AI가 개발팀 전달을 권장했지만 GitHub Issue가 자동으로 생성되지 않는다고 문의한다.

## 확인 포인트

- AI 결과의 suggested_action이 github_issue_recommended인지 확인한다.
- 관리자가 `GitHub Issue 등록 승인` 버튼을 눌렀는지 확인한다.
- GitHub 토큰 권한이 쓰기 권한을 포함하는지 확인한다.

## 답변 가이드

Issue 생성은 자동 실행되지 않고 관리자 승인 후에만 실행된다고 안내한다.

## 개발팀 전달 기준

승인 후 생성 실패가 반복되면 MCP 또는 GitHub API 연동 문제로 분류한다.
