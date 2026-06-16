# 회원 권한 관리 시나리오

## 1. 기본 정책

회원가입으로 생성되는 계정은 항상 일반 사용자 권한을 가집니다.

```text
기본 권한: USER
```

관리자 또는 담당자 권한은 회원가입 화면에서 선택하지 않습니다. 운영자가
데이터베이스에서 해당 사용자의 `role` 값을 변경해 부여합니다.

```text
USER -> MANAGER
```

## 2. 권한 종류

| Role | 의미 | 가능한 작업 |
| --- | --- | --- |
| `USER` | 일반 사용자 | 게시글 작성, 게시글 조회, 댓글 작성 |
| `MANAGER` | 담당자/관리자 | 일반 사용자 기능 + 게시글 AI 검토 실행 |

## 3. 일반 사용자 가입 흐름

```text
1. 사용자가 회원가입한다.
2. NestJS AuthService가 users 테이블에 계정을 저장한다.
3. role 컬럼은 기본값 USER로 저장된다.
4. 로그인 시 JWT payload에 role: USER가 포함된다.
```

## 4. 담당자 권한 부여 흐름

운영자는 DB에서 특정 사용자를 담당자로 승격합니다.

```sql
UPDATE users
SET role = 'MANAGER'
WHERE email = 'manager@example.com';
```

권한을 바꾼 뒤 사용자는 다시 로그인해야 새 JWT에 `MANAGER` role이 포함됩니다.

## 5. 담당자 기능 보호

게시글 AI 검토 API는 로그인 여부와 담당자 권한을 모두 확인합니다.

```text
POST /posts/:id/ai-review
  -> JwtAuthGuard: 로그인 여부 확인
  -> ManagerGuard: role이 MANAGER인지 확인
```

일반 사용자가 해당 API를 호출하면 `403 Forbidden` 응답을 받습니다.

## 6. 화면 노출 정책

React 클라이언트는 로그인 응답의 `user.role` 값을 `localStorage`에 저장합니다.

```text
accessToken: JWT
userRole: USER 또는 MANAGER
```

게시글 상세 화면에서는 `userRole === 'MANAGER'`일 때만
`AI 담당자 검토` 패널을 표시합니다.

## 7. 주의사항

- 프론트엔드의 버튼 숨김은 사용성 보조일 뿐입니다.
- 실제 권한 보호는 서버의 `ManagerGuard`가 담당합니다.
- DB에서 role을 변경한 뒤에는 사용자가 다시 로그인해야 합니다.
- 현재 role은 `USER`, `MANAGER` 두 가지만 사용합니다.
