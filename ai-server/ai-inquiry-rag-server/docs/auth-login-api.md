# 로그인 API 문서

## 기능

사용자의 이메일과 비밀번호를 받아 인증하고 access token을 발급한다.

## 요청

`POST /auth/login`

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

## 주요 실패 원인

- 이메일 또는 비밀번호 불일치
- API 서버 미실행
- CORS 설정 누락
- JWT 발급 설정 오류

## 운영 대응

로그인 장애 문의가 들어오면 CORS, 인증 실패, 서버 상태를 순서대로 확인한다.

