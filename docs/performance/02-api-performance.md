# 02. 게시판 API 성능 평가

## 1. 평가 대상

NestJS `basic-server`의 게시판 API를 평가합니다.

주요 API:

```text
POST /auth/signup
POST /auth/login
GET /posts
POST /posts
GET /posts/:id
PATCH /posts/:id
DELETE /posts/:id
GET /posts/:postId/comments
POST /posts/:postId/comments
DELETE /posts/comments/:id
POST /posts/:id/ai-review
```

## 2. 핵심 확인 사항

- 인증이 필요한 API와 필요 없는 API가 구분되는가?
- JWT가 없으면 게시글 작성, 수정, 삭제가 막히는가?
- 일반 사용자는 본인 게시글만 수정/삭제 가능한가?
- 관리자는 전체 게시글과 댓글을 관리할 수 있는가?
- 게시글 목록은 페이지네이션과 검색을 함께 처리하는가?
- AI 검토 API는 `MANAGER`만 호출 가능한가?

## 3. 응답 시간 기준

개발 환경 기준의 권장 목표입니다.

| API | 목표 |
| --- | --- |
| `GET /posts` | 300ms 이하 |
| `GET /posts/:id` | 300ms 이하 |
| `POST /posts` | 500ms 이하 |
| `POST /posts/:postId/comments` | 500ms 이하 |
| `POST /posts/:id/ai-review` | LLM 호출 포함으로 별도 측정 |

AI 검토 API는 FastAPI, RAG, LLM 호출이 포함되므로 일반 게시판 API와 같은
기준으로 평가하지 않습니다.

## 4. 테스트 시나리오

### 4.1 게시글 목록 조회

```text
1. 게시글 10개 이상 생성
2. GET /posts?page=1&limit=10 호출
3. total, page, limit, totalPages 확인
4. 응답 시간 기록
```

확인 항목:

- 최신 글이 먼저 나오는가?
- `items` 배열 길이가 `limit` 이하인가?
- `totalPages`가 올바른가?

### 4.2 검색

```text
1. 제목에 "로그인"이 포함된 게시글 생성
2. 본문에 "CORS"가 포함된 게시글 생성
3. GET /posts?keyword=로그인 호출
4. GET /posts?keyword=CORS 호출
```

확인 항목:

- 제목 검색이 되는가?
- 본문 검색이 되는가?
- 검색어가 없는 경우 전체 목록이 나오는가?

### 4.3 권한

```text
1. user-a로 게시글 작성
2. user-b로 같은 게시글 수정 시도
3. MANAGER로 같은 게시글 수정 시도
```

기대 결과:

- user-b는 실패해야 한다.
- MANAGER는 성공해야 한다.

## 5. 결과 기록 양식

| API | 1회차 | 2회차 | 3회차 | 평균 | 결과 |
| --- | ---: | ---: | ---: | ---: | --- |
| `GET /posts` |  |  |  |  |  |
| `GET /posts/:id` |  |  |  |  |  |
| `POST /posts` |  |  |  |  |  |
| `POST /comments` |  |  |  |  |  |

## 6. 병목 후보

- `findAndCount`는 데이터가 많아지면 비용이 증가할 수 있다.
- `ILIKE '%keyword%'` 검색은 인덱스를 잘 활용하기 어렵다.
- 댓글을 매번 전체 재조회하면 댓글 수가 많을 때 비용이 커진다.
- TypeORM `synchronize: true`는 개발 편의 기능이며 운영에서는 꺼야 한다.

