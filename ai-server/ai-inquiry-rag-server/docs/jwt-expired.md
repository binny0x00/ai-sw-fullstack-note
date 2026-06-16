# JWT 만료 대응 가이드

## 증상

로그인 후 일정 시간이 지나 API 요청이 401 Unauthorized로 실패한다.

## 원인

access token이 만료되었거나 refresh token 재발급 흐름이 실패했을 수 있다.

## 해결 방향

- access token 만료 시간 확인
- refresh token API 동작 확인
- 프론트엔드에서 401 응답 처리 로직 확인

