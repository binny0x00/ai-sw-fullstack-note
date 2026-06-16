# FAQ

## CORS 에러는 프론트엔드 문제인가요, 백엔드 문제인가요?

대부분 백엔드 설정 문제입니다.

브라우저가 보안 정책에 따라 응답 접근을 막는 것이므로, 백엔드에서
프론트엔드 origin을 허용해야 합니다.

다만 프론트엔드에서도 쿠키 인증을 사용하는 경우 `credentials: "include"`
설정이 필요합니다.

## `401 Unauthorized`와 `403 Forbidden`의 차이는 무엇인가요?

`401 Unauthorized`는 인증되지 않았다는 뜻입니다.

예시:

- 로그인하지 않음
- 토큰이 없음
- 토큰이 만료됨
- 토큰이 유효하지 않음

`403 Forbidden`은 인증은 되었지만 권한이 없다는 뜻입니다.

예시:

- 일반 사용자가 관리자 API에 접근함
- 본인 소유가 아닌 리소스를 수정하려고 함

## JWT는 어디에 저장하는 것이 좋나요?

간단한 프로젝트에서는 `localStorage`를 사용할 수 있습니다.

하지만 보안이 중요한 서비스에서는 HttpOnly Cookie를 사용하는 것이 좋습니다.
HttpOnly Cookie는 JavaScript에서 직접 접근할 수 없기 때문에 XSS 공격에 더
강합니다.

## 비밀번호는 DB에 그대로 저장해도 되나요?

절대 안 됩니다.

비밀번호는 반드시 bcrypt 같은 해시 알고리즘으로 암호화해서 저장해야 합니다.

예시:

```js
const hashedPassword = await bcrypt.hash(password, 10);
```

로그인 시에는 입력된 비밀번호와 저장된 해시를 비교합니다.

```js
const isValid = await bcrypt.compare(password, user.password);
```

## 로그인 성공 후 사용자 정보는 어디에 저장하나요?

프론트엔드에서는 보통 전역 상태에 저장합니다.

예시:

- React Context
- Zustand
- Redux
- TanStack Query cache

단, 비밀번호나 민감한 정보는 저장하지 않습니다.

## Access Token과 Refresh Token의 차이는 무엇인가요?

Access Token은 API 요청에 사용하는 짧은 수명의 토큰입니다.

Refresh Token은 Access Token을 재발급받기 위한 긴 수명의 토큰입니다.

Access Token이 탈취되었을 때 피해를 줄이기 위해 만료 시간을 짧게 설정합니다.

## 토큰이 만료되면 무조건 로그아웃해야 하나요?

아닙니다.

Refresh Token이 있다면 Access Token을 재발급받을 수 있습니다. Refresh Token도
만료되었거나 유효하지 않다면 로그아웃 처리합니다.

## 쿠키 인증을 사용할 때 CORS 설정은 어떻게 해야 하나요?

백엔드에서 `credentials: true`를 설정해야 합니다.

```js
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
```

프론트엔드 요청에도 `credentials` 옵션이 필요합니다.

```js
fetch("/api/me", {
  credentials: "include",
});
```

## 로그인 API에서 이메일이 틀렸는지 비밀번호가 틀렸는지 알려줘도 되나요?

보안상 권장하지 않습니다.

공격자가 가입된 이메일을 추측할 수 있기 때문입니다. 대신 다음처럼 공통
메시지를 사용합니다.

```json
{
  "message": "이메일 또는 비밀번호가 올바르지 않습니다."
}
```

## API 요청마다 사용자 정보를 DB에서 조회해야 하나요?

상황에 따라 다릅니다.

JWT payload에 사용자 `id`와 `role` 정도만 넣고, 요청 처리 시 필요한 경우 DB에서
최신 사용자 정보를 조회하는 방식이 일반적입니다.

권한이나 계정 상태가 자주 바뀌는 서비스라면 DB 조회가 더 안전합니다.

## 로그아웃은 서버에서 처리해야 하나요?

JWT를 `localStorage`에 저장하는 구조라면 클라이언트에서 토큰을 삭제하는
것만으로도 로그아웃처럼 동작합니다.

하지만 refresh token을 서버나 쿠키로 관리한다면 서버에 로그아웃 API를 두고
refresh token을 폐기하는 것이 좋습니다.

## 개발 환경에서는 되는데 배포 후 로그인이 안 되는 이유는 무엇인가요?

주로 다음 원인입니다.

- CORS origin이 배포 도메인을 허용하지 않음
- 쿠키의 `SameSite`, `Secure` 설정 문제
- HTTP 환경에서 Secure 쿠키를 사용함
- 환경변수 누락
- 프론트엔드 API base URL이 localhost로 남아 있음
- JWT secret이 개발 환경과 운영 환경에서 다름
