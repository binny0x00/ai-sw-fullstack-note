# JWT 만료 처리 정리

## JWT 만료란?

JWT는 발급 시 만료 시간(`exp`)을 포함할 수 있습니다. 만료 시간이 지난 토큰은
더 이상 유효하지 않습니다.

서버는 요청에 포함된 JWT를 검증할 때 만료 여부를 확인하고, 만료된 경우 인증
실패 응답을 반환합니다.

## 자주 보는 응답

```http
401 Unauthorized
```

```json
{
  "message": "토큰이 만료되었습니다."
}
```

또는 라이브러리에 따라 다음과 같은 에러가 발생할 수 있습니다.

```text
TokenExpiredError: jwt expired
```

## 발생 원인

- access token의 만료 시간이 지남
- 사용자가 오래 전에 로그인함
- 서버 시간이 잘못 설정됨
- refresh token 재발급 로직이 없음
- 프론트엔드가 만료된 토큰을 계속 사용함

## 기본 처리 방식

JWT가 만료되면 클라이언트는 다음 중 하나로 처리합니다.

- 사용자를 로그아웃시킴
- refresh token으로 access token을 재발급함
- 재발급에 실패하면 로그인 페이지로 이동시킴

## Refresh Token 방식

보통 access token은 짧게, refresh token은 길게 유지합니다.

예시:

- access token: 15분
- refresh token: 7일 또는 14일

처리 흐름:

1. API 요청을 보냅니다.
2. 서버가 `401 Unauthorized`를 반환합니다.
3. 프론트엔드가 refresh API를 호출합니다.
4. refresh token이 유효하면 새 access token을 받습니다.
5. 원래 실패했던 요청을 다시 보냅니다.
6. refresh token도 만료되었으면 로그아웃 처리합니다.

## 프론트엔드 예시

```js
async function fetchWithAuth(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status !== 401) {
    return response;
  }

  const refreshResponse = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  if (!refreshResponse.ok) {
    logout();
    throw new Error("로그인이 만료되었습니다.");
  }

  const data = await refreshResponse.json();
  accessToken = data.accessToken;

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
```

## 백엔드 처리 예시

서버는 JWT 검증 중 만료 에러를 구분해서 응답할 수 있습니다.

```js
try {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  req.user = payload;
  next();
} catch (error) {
  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      message: "토큰이 만료되었습니다.",
    });
  }

  return res.status(401).json({
    message: "유효하지 않은 토큰입니다.",
  });
}
```

## 주의할 점

- 만료된 access token을 `localStorage`에 계속 남겨두면 같은 에러가 반복됩니다.
- refresh 요청이 여러 번 동시에 발생하지 않도록 제어하는 것이 좋습니다.
- refresh token은 HttpOnly Cookie에 저장하는 방식이 더 안전합니다.
- 로그아웃 시 access token과 refresh token을 모두 제거해야 합니다.

## 체크리스트

- access token에 만료 시간이 설정되어 있는가?
- 만료 시 `401` 응답을 반환하는가?
- 프론트엔드가 `401`을 감지하는가?
- refresh API가 있는가?
- refresh 실패 시 로그아웃 처리하는가?
