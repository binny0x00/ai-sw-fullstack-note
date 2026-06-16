# 로그인 API 정리

## 로그인 API의 목적

로그인 API는 사용자가 입력한 인증 정보를 확인하고, 인증에 성공하면 이후
요청에서 사용할 인증 수단을 발급합니다.

일반적으로 이메일과 비밀번호를 받아 사용자를 확인한 뒤 JWT 토큰 또는 세션
쿠키를 반환합니다.

## 요청 예시

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

## 성공 응답 예시

JWT를 응답 body로 내려주는 방식입니다.

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동"
  }
}
```

쿠키로 인증 정보를 내려주는 방식입니다.

```http
Set-Cookie: accessToken=eyJhbGciOiJIUzI1NiIs...; HttpOnly; Path=/; SameSite=Lax
```

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동"
  }
}
```

## 실패 응답 예시

이메일 또는 비밀번호가 틀린 경우입니다.

```http
401 Unauthorized
```

```json
{
  "message": "이메일 또는 비밀번호가 올바르지 않습니다."
}
```

입력값이 부족한 경우입니다.

```http
400 Bad Request
```

```json
{
  "message": "이메일과 비밀번호를 입력해 주세요."
}
```

## 백엔드 처리 흐름

1. 요청 body에서 이메일과 비밀번호를 받습니다.
2. 이메일로 사용자를 조회합니다.
3. 사용자가 없으면 `401 Unauthorized`를 반환합니다.
4. 비밀번호 해시를 비교합니다.
5. 비밀번호가 틀리면 `401 Unauthorized`를 반환합니다.
6. 인증에 성공하면 토큰 또는 세션을 발급합니다.
7. 사용자 정보와 인증 정보를 응답합니다.

## 프론트엔드 처리 흐름

1. 로그인 폼에서 이메일과 비밀번호를 입력받습니다.
2. `/api/auth/login`으로 `POST` 요청을 보냅니다.
3. 성공하면 토큰을 저장하거나 쿠키 인증 상태를 유지합니다.
4. 사용자 정보를 전역 상태에 저장합니다.
5. 메인 페이지 또는 이전 페이지로 이동합니다.
6. 실패하면 에러 메시지를 화면에 보여줍니다.

## JWT 저장 위치

JWT를 저장하는 대표적인 방식은 다음과 같습니다.

| 방식 | 장점 | 단점 |
| --- | --- | --- |
| `localStorage` | 구현이 쉽다 | XSS에 취약하다 |
| memory state | 비교적 안전하다 | 새로고침 시 사라진다 |
| HttpOnly Cookie | JS에서 접근 불가해 안전하다 | CSRF 대응이 필요하다 |

실무에서는 보안이 중요한 경우 HttpOnly Cookie 방식을 많이 사용합니다.

## 보안 주의사항

- 비밀번호는 반드시 해시로 저장합니다.
- 로그인 실패 메시지는 너무 구체적으로 주지 않습니다.
- JWT secret은 코드에 직접 작성하지 않고 환경변수로 관리합니다.
- HTTPS 환경에서 쿠키의 `Secure` 옵션을 사용합니다.
- access token 만료 시간을 너무 길게 잡지 않습니다.
