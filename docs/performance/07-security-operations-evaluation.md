# 07. 보안과 운영 평가

## 1. 평가 대상

이 문서는 인증, 권한, API Key, 운영 설정, migration 전략을 평가하기 위한
체크리스트입니다.

## 2. 인증과 권한

현재 권한 모델:

```text
USER
  일반 사용자
  게시글 작성, 본인 게시글 수정/삭제, 댓글 작성 가능

MANAGER
  담당자
  전체 게시글 관리, 댓글 관리, AI 검토, GitHub Issue 승인 가능
```

관리자 권한 부여 방식:

```sql
UPDATE users
SET role = 'MANAGER'
WHERE email = 'manager@example.com';
```

평가 항목:

- 회원가입 기본 role이 `USER`인가?
- JWT payload에 role이 포함되는가?
- 관리자 API는 `JwtAuthGuard`와 `ManagerGuard`로 보호되는가?
- 일반 사용자가 AI 검토 API를 호출하면 거부되는가?

## 3. API Key와 Token 관리

민감 정보:

```text
OPENAI_API_KEY
GITHUB_TOKEN
DB_PASSWORD
JWT_SECRET
```

원칙:

- 실제 `.env` 파일은 Git에 커밋하지 않는다.
- `.env.example`에는 placeholder만 둔다.
- Token은 필요한 최소 권한만 부여한다.
- Token은 유출되면 즉시 폐기하고 재발급한다.
- 운영에서는 주기적인 회전 정책을 둔다.

## 4. GitHub Token 권한 범위

GitHub Issue 생성에 필요한 최소 권한은 repository issue 생성 권한입니다.
가능하면 전체 계정 권한이 아닌 특정 repository에 제한된 fine-grained token을
사용합니다.

권장:

```text
Repository access: selected repositories
Permissions:
  Issues: Read and write
  Metadata: Read-only
```

Project 연동까지 사용하는 경우에는 프로젝트 관련 권한이 추가로 필요할 수
있습니다.

## 5. 운영 DB 설정

개발에서는 TypeORM `synchronize: true`가 편리하지만, 운영에서는 위험합니다.
운영에서는 스키마 변경을 migration으로 관리해야 합니다.

운영 권장:

```text
TYPEORM_SYNCHRONIZE=false
npm run migration:run
```

평가 항목:

- 운영에서 `synchronize`를 끌 수 있는가?
- migration 실행 스크립트가 있는가?
- migration 파일이 스키마 변경 이력을 남기는가?

## 6. 감사 로그

AI와 MCP 기능은 운영 판단에 영향을 주므로 로그가 중요합니다.

저장 대상:

```text
ai_analysis_results
mcp_execution_logs
```

확인 항목:

- Agent 판단 결과가 저장되는가?
- MCP 실행 요청 payload가 저장되는가?
- MCP 실행 응답 payload가 저장되는가?
- 실패한 MCP 호출도 로그로 남는가?

## 7. 보안 평가 체크리스트

| 항목 | 통과 |
| --- | --- |
| `.env`는 커밋되지 않는다 |  |
| `.env.example`에는 placeholder만 있다 |  |
| 일반 사용자는 관리자 기능을 사용할 수 없다 |  |
| GitHub Issue는 관리자 승인 후에만 생성된다 |  |
| 운영에서 `TYPEORM_SYNCHRONIZE=false`를 설정할 수 있다 |  |
| Token 권한 범위를 설명할 수 있다 |  |
| MCP 실행 로그가 남는다 |  |

