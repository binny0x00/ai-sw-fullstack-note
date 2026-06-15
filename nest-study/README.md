# Nest CRUD Study

이 프로젝트는 NestJS의 기본 CRUD 구조를 학습하기 위한 예제입니다.

데이터베이스 설정 없이 핵심 개념을 먼저 볼 수 있도록 인메모리 Repository를 사용합니다. 실제 서비스에서는 Repository 구현체만 TypeORM, Prisma, MongoDB 등으로 교체하면 됩니다.

## 포함된 핵심 개념

- `Controller`: HTTP 라우팅, 경로 파라미터, 쿼리스트링, 요청 body, 상태 코드 처리
- `Service`: 비즈니스 로직과 흐름 제어
- `Repository`: 저장소 접근 책임 분리
- `DTO`: 요청 데이터 계약 정의
- `ValidationPipe`: 입력값 검증, 타입 변환, 허용되지 않은 필드 제거
- `Exception`: 존재하지 않는 리소스에 대한 `NotFoundException`
- `Pagination`: `page`, `limit` 기반 목록 조회
- `Search`: `keyword` 기반 제목/내용 검색
- `DI Token`: Repository 구현체를 추상화해서 교체 가능하게 만드는 패턴

## 실행 방법

의존성을 설치한 뒤 개발 서버를 실행합니다.

```bash
pnpm install
pnpm start:dev
```

타입 체크만 실행하려면:

```bash
pnpm typecheck
```

빌드하려면:

```bash
pnpm build
```

## API 예시

게시글 생성:

```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"첫 게시글","content":"Nest CRUD 예제입니다.","tags":["nest","crud"]}'
```

게시글 목록 조회:

```bash
curl "http://localhost:3000/posts?page=1&limit=10"
```

검색:

```bash
curl "http://localhost:3000/posts?page=1&limit=10&keyword=nest"
```

게시글 상세 조회:

```bash
curl "http://localhost:3000/posts/{id}"
```

게시글 수정:

```bash
curl -X PATCH http://localhost:3000/posts/{id} \
  -H "Content-Type: application/json" \
  -d '{"title":"수정된 제목","tags":["updated","nest"]}'
```

게시글 삭제:

```bash
curl -X DELETE http://localhost:3000/posts/{id}"
```

## package.json 설명

`package.json`은 프로젝트의 실행 명령, 의존성, 개발 도구를 정의하는 파일입니다. JSON은 주석을 지원하지 않기 때문에 각 항목의 설명은 이 문서에 작성합니다.

### 기본 필드

- `name`: 프로젝트 또는 패키지 이름입니다.
- `version`: 프로젝트 버전입니다.
- `private`: `true`이면 npm에 실수로 배포되는 것을 막습니다.

### scripts

- `start`: `nest start`로 Nest 애플리케이션을 한 번 실행합니다.
- `start:dev`: `nest start --watch`로 파일 변경을 감지하면서 개발 서버를 실행합니다.
- `build`: `nest build`로 TypeScript 코드를 JavaScript로 빌드합니다.
- `typecheck`: `tsc --noEmit`으로 JavaScript 파일을 만들지 않고 타입 검사만 실행합니다.

### dependencies

런타임에 필요한 패키지입니다.

- `@nestjs/common`: `Controller`, `Injectable`, `Module`, `ValidationPipe`, `NotFoundException` 같은 Nest 공통 기능을 제공합니다.

  ```ts
  import { Controller, Get, Injectable, NotFoundException } from '@nestjs/common';

  @Controller('posts')
  export class PostsController {
    @Get()
    findAll() {
      return [];
    }
  }

  @Injectable()
  export class PostsService {
    findOne(post: unknown) {
      if (!post) {
        throw new NotFoundException('Post not found');
      }
    }
  }
  ```

- `@nestjs/core`: Nest 런타임, 의존성 주입 컨테이너, 모듈 시스템을 담당합니다.

  ```ts
  import { NestFactory } from '@nestjs/core';
  import { AppModule } from './app.module';

  async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    await app.listen(3000);
  }
  ```

- `@nestjs/platform-express`: Nest 애플리케이션을 Express 기반 HTTP 서버로 실행하게 해주는 어댑터입니다.

  ```ts
  // 별도 코드에서 직접 호출하지 않아도 됩니다.
  // @nestjs/platform-express가 설치되어 있으면 NestFactory가 기본 HTTP 서버로 Express adapter를 사용합니다.
  const app = await NestFactory.create(AppModule);
  ```

- `@nestjs/mapped-types`: `PartialType` 같은 DTO 유틸리티를 제공합니다.

  ```ts
  import { PartialType } from '@nestjs/mapped-types';
  import { CreatePostDto } from './create-post.dto';

  export class UpdatePostDto extends PartialType(CreatePostDto) {}
  ```

- `class-validator`: `@IsString`, `@MinLength`, `@MaxLength` 같은 DTO 검증 데코레이터를 제공합니다.

  ```ts
  import { IsString, MaxLength, MinLength } from 'class-validator';

  export class CreatePostDto {
    @IsString()
    @MinLength(1)
    @MaxLength(120)
    title!: string;
  }
  ```

- `class-transformer`: 쿼리스트링 문자열을 숫자로 바꾸는 등 요청값 변환에 사용합니다.

  ```ts
  import { Transform } from 'class-transformer';
  import { IsInt, Min } from 'class-validator';

  export class PostQueryDto {
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    page = 1;
  }
  ```

- `reflect-metadata`: 데코레이터 기반 메타데이터를 런타임에서 사용할 수 있게 합니다. Nest에서 필수에 가깝습니다.

  ```ts
  import 'reflect-metadata';

  // Nest는 Controller, Injectable, Module 같은 데코레이터 메타데이터를 런타임에 읽어서
  // 라우팅과 의존성 주입을 구성합니다.
  ```

- `rxjs`: Nest 내부에서 Observable 기반 처리를 위해 사용합니다.

  ```ts
  import { of } from 'rxjs';

  const result$ = of({ message: 'hello' });
  ```

### devDependencies

개발과 빌드 과정에서 필요한 패키지입니다.

- `@nestjs/cli`: `nest start`, `nest build` 같은 Nest CLI 명령을 제공합니다.
- `@types/node`: Node.js API 타입 정의를 제공합니다.
- `typescript`: TypeScript 컴파일러입니다.

## 구조

```text
src
├── app.module.ts
├── main.ts
├── common
│   └── paginated-response.ts
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

## 설계 의도

이 예제는 단순히 동작하는 CRUD가 아니라, 실무 코드로 확장할 때 필요한 분리 기준을 보여주는 것을 목표로 합니다.

- Controller는 HTTP 입출력만 담당합니다.
- Service는 비즈니스 규칙과 예외 처리를 담당합니다.
- Repository는 데이터 저장소 접근을 담당합니다.
- DTO는 요청 데이터의 형식과 검증 규칙을 담당합니다.
- Repository는 DI Token으로 주입되므로 구현체를 쉽게 바꿀 수 있습니다.
