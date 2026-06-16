# CORS 에러 정리

## CORS란?

CORS(Cross-Origin Resource Sharing)는 브라우저가 서로 다른 출처(origin) 간의
요청을 제한하는 보안 정책입니다.

출처는 다음 3가지가 모두 같아야 동일 출처로 봅니다.

- 프로토콜: `http`, `https`
- 도메인: `localhost`, `example.com`
- 포트: `3000`, `8080`

예를 들어 프론트엔드가 `http://localhost:3000`이고 백엔드가
`http://localhost:8080`이면 서로 다른 출처입니다.

## 자주 보는 에러

```text
Access to fetch at 'http://localhost:8080/api/users'
from origin 'http://localhost:3000'
has been blocked by CORS policy
```

브라우저가 백엔드 응답을 막았다는 뜻입니다. 요청 자체가 서버에 도달했을 수도
있지만, 브라우저가 응답을 프론트엔드 코드에 넘겨주지 않습니다.

## 원인

백엔드 서버가 프론트엔드 출처를 허용하지 않았기 때문입니다.

특히 다음 상황에서 자주 발생합니다.

- 프론트엔드와 백엔드 포트가 다름
- `Authorization` 헤더를 보내는데 서버가 허용하지 않음
- 쿠키 인증을 사용하는데 credentials 설정이 빠짐
- preflight 요청인 `OPTIONS`를 서버가 처리하지 못함

## 해결 방법

백엔드에서 허용할 origin을 명시합니다.

```js
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
```

쿠키 인증을 사용하는 경우 `credentials: true`를 설정합니다.

```js
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
```

프론트엔드 요청에도 credentials 설정이 필요합니다.

```js
fetch("http://localhost:8080/api/me", {
  credentials: "include",
});
```

## 주의할 점

개발 중에는 `origin: "*"`를 사용할 수 있지만, 인증 정보가 포함된 요청에서는
사용할 수 없습니다.

```js
// 쿠키 인증과 함께 사용 불가
origin: "*",
credentials: true,
```

운영 환경에서는 실제 프론트엔드 도메인만 허용하는 것이 안전합니다.

## 체크리스트

- 프론트엔드 주소가 CORS origin에 포함되어 있는가?
- `Authorization` 헤더를 허용했는가?
- 쿠키를 쓴다면 `credentials: true`를 양쪽에 설정했는가?
- 서버가 `OPTIONS` 요청에 정상 응답하는가?
- 브라우저 콘솔의 에러와 서버 로그를 함께 확인했는가?
