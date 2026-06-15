# Nest PostgreSQL CRUD Study

이 프로젝트는 NestJS에서 PostgreSQL과 TypeORM을 연결해 기본 CRUD를 학습하기 위한 예제입니다.

`nest-study`는 인메모리 Repository를 사용하지만, 이 프로젝트는 실제 PostgreSQL 테이블을 사용합니다.

중요한 차이:

- `@nestjs/typeorm`으로 DB 연결
- `typeorm` Repository로 CRUD 구현
- PostgreSQL 드라이버 `pg` 사용
- `synchronize: false` 사용
- 테이블은 직접 SQL로 생성

## 실행 순서

1. PostgreSQL 데이터베이스를 준비합니다.
2. [database-schema.md](./database-schema.md)의 SQL로 테이블을 생성합니다.
3. `.env.example`을 참고해 `.env`를 만듭니다.
4. 의존성을 설치하고 서버를 실행합니다.

```bash
pnpm install
pnpm start:dev
```

타입 체크:

```bash
pnpm typecheck
```

## API

게시글 생성:

```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"첫 게시글","content":"PostgreSQL CRUD 예제입니다.","tags":["nest","postgres"]}'
```

게시글 목록:

```bash
curl "http://localhost:3000/posts?page=1&limit=10&keyword=nest"
```

게시글 상세:

```bash
curl "http://localhost:3000/posts/{id}"
```

게시글 수정:

```bash
curl -X PATCH http://localhost:3000/posts/{id} \
  -H "Content-Type: application/json" \
  -d '{"title":"수정된 제목","tags":["updated","typeorm"]}'
```

게시글 삭제:

```bash
curl -X DELETE http://localhost:3000/posts/{id}
```

## 구조

```text
src
├── app.module.ts
├── main.ts
├── common
│   └── paginated-response.ts
├── config
│   └── typeorm.config.ts
└── posts
    ├── dto
    │   ├── create-post.dto.ts
    │   ├── post-query.dto.ts
    │   └── update-post.dto.ts
    ├── entities
    │   └── post.entity.ts
    ├── posts.controller.ts
    ├── posts.module.ts
    ├── posts.repository.ts
    └── posts.service.ts
```

## 설계 포인트

- Controller는 HTTP 요청/응답만 담당합니다.
- Service는 비즈니스 로직과 예외 처리를 담당합니다.
- Repository는 TypeORM 접근을 감싸는 저장소 계층입니다.
- Service는 TypeORM Repository를 직접 알지 않고 `POSTS_REPOSITORY` 토큰에 의존합니다.
- DB schema 자동 생성은 사용하지 않습니다. `synchronize: false`로 두고 SQL을 직접 관리합니다.
