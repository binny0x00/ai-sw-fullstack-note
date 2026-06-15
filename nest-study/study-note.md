# Nest/API 학습 노트

## curl

- 터미널에서 HTTP 요청을 보내는 CLI 도구
- API 서버가 제대로 동작하는지 빠르게 확인하기 위함

## `-X` HTTP 메서드

`-X`는 어떤 HTTP 메서드로 요청할지 지정할 때 사용합니다.

| 메서드 | 의미 | 비고 |
| --- | --- | --- |
| `GET` | 조회 | 기본값으로 `-X` 생략 가능 |
| `POST` | 생성 | `-H`로 HTTP 헤더 추가 |
| `PATCH` | 일부 수정 | `-H`로 HTTP 헤더 추가 |
| `PUT` | 전체 수정 |  |
| `DELETE` | 삭제 |  |

## 정리

- `-X`: 어떤 HTTP 메서드로 요청할지 지정
- `-H`: 요청 헤더 추가
- `-d`: 요청 body 데이터 추가

## NestJS 계층 구조

NestJS에서는 하나의 기능을 보통 여러 계층으로 나눠서 작성합니다.

대표적인 CRUD 흐름은 아래와 같습니다.

```text
Client
  -> Controller
  -> Service
  -> Repository
  -> Data Store
```

각 계층은 서로 다른 책임을 가집니다.

| 계층 | 역할 |
| --- | --- |
| `Controller` | HTTP 요청과 응답을 담당 |
| `Service` | 비즈니스 로직과 예외 처리를 담당 |
| `Repository` | 데이터 저장소 접근을 담당 |
| `DTO` | 요청 데이터의 형태와 검증 규칙을 담당 |
| `Entity` | 데이터 모델의 구조를 표현 |
| `Module` | 관련 Controller, Service, Repository를 묶는 단위 |

### Controller

Controller는 HTTP 요청을 받는 진입점입니다.

Controller는 요청을 직접 처리하기보다, 요청값을 정리해서 Service에 넘기는 역할에 집중하는 것이 좋습니다.

```ts
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  create(@Body() dto: CreatePostDto) {
    return this.postsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }
}
```

Controller의 책임:

- URL과 HTTP 메서드 매핑
- `@Body()`, `@Param()`, `@Query()`로 요청 데이터 받기
- Service 호출
- HTTP 상태 코드나 요청/응답 형식 처리

Controller에서 피하는 것이 좋은 것:

- 데이터 저장 로직
- 복잡한 비즈니스 규칙
- Repository 직접 호출

### Service

Service는 실제 기능의 흐름과 비즈니스 규칙을 담당합니다.

예를 들어 게시글 상세 조회에서 게시글이 없으면 `NotFoundException`을 던지는 규칙은 Service에 두는 것이 자연스럽습니다.

```ts
@Injectable()
export class PostsService {
  constructor(
    @Inject(POSTS_REPOSITORY)
    private readonly postsRepository: PostsRepository,
  ) {}

  async findOne(id: string) {
    const post = await this.postsRepository.findById(id);

    if (!post) {
      throw new NotFoundException(`Post ${id} not found`);
    }

    return post;
  }
}
```

Service의 책임:

- 비즈니스 규칙 처리
- 여러 Repository나 외부 API 호출 조합
- 예외 처리
- 트랜잭션이 필요한 작업의 흐름 제어

### Repository

Repository는 데이터 저장소에 접근하는 계층입니다.

현재 `nest-study`에서는 DB 없이 학습할 수 있도록 `InMemoryPostsRepository`를 사용합니다.

```ts
export type PostsRepository = {
  create(dto: CreatePostDto): Promise<Post>;
  findById(id: string): Promise<Post | null>;
  update(id: string, dto: UpdatePostDto): Promise<Post | null>;
  delete(id: string): Promise<boolean>;
};
```

Repository 구현체 예시:

```ts
@Injectable()
export class InMemoryPostsRepository implements PostsRepository {
  private readonly posts = new Map<string, Post>();

  async findById(id: string) {
    return this.posts.get(id) ?? null;
  }
}
```

Repository의 책임:

- 데이터 생성, 조회, 수정, 삭제
- DB 쿼리 또는 저장소 접근
- 저장소 구현 상세 은닉

Service가 Repository 타입에 의존하면, 나중에 저장소를 쉽게 교체할 수 있습니다.

```text
InMemoryPostsRepository
-> TypeOrmPostsRepository
-> PrismaPostsRepository
```

Service 코드는 크게 바꾸지 않고 Repository 구현체만 바꾸는 구조가 됩니다.

### DTO

DTO는 요청 데이터의 형태를 정의합니다.

```ts
export class CreatePostDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  content!: string;
}
```

DTO의 책임:

- 요청 body, query 등의 타입 정의
- validation 규칙 정의
- Controller와 Service 사이의 입력 계약 역할

### Entity

Entity는 데이터의 구조를 표현합니다.

현재 예제에서는 DB를 사용하지 않기 때문에 TypeORM 데코레이터가 붙은 클래스가 아니라 단순 타입으로 작성했습니다.

```ts
export type Post = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};
```

실제 DB를 사용하면 Entity는 테이블 구조를 표현하는 클래스가 될 수 있습니다.

### Module

Module은 관련된 기능을 하나로 묶는 단위입니다.

```ts
@Module({
  controllers: [PostsController],
  providers: [
    PostsService,
    {
      provide: POSTS_REPOSITORY,
      useClass: InMemoryPostsRepository,
    },
  ],
})
export class PostsModule {}
```

Module의 책임:

- Controller 등록
- Service 등록
- Repository provider 등록
- 다른 Module import/export

## 의존성 주입

의존성 주입은 클래스가 필요한 객체를 직접 만들지 않고, 외부에서 받아서 사용하는 방식입니다.

직접 생성하는 방식:

```ts
export class PostsController {
  private readonly postsService = new PostsService();
}
```

이 방식은 단순하지만 단점이 있습니다.

- 테스트하기 어려움
- 구현체 교체가 어려움
- 객체 생성 책임이 여러 곳에 퍼짐

Nest에서는 생성자 주입을 사용합니다.

```ts
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}
}
```

`PostsController`는 `PostsService`를 직접 만들지 않습니다.

대신 Nest DI 컨테이너가 `PostsService` 인스턴스를 만들고 Controller에 넣어줍니다.

### Provider

Nest DI 컨테이너가 관리하는 대상을 provider라고 부릅니다.

대표적인 provider는 Service입니다.

```ts
@Injectable()
export class PostsService {}
```

모듈에 provider로 등록합니다.

```ts
@Module({
  providers: [PostsService],
})
export class PostsModule {}
```

이렇게 등록하면 다른 클래스에서 생성자 주입으로 사용할 수 있습니다.

### Injection Token

클래스 자체를 주입할 수도 있지만, 문자열이나 Symbol 같은 토큰으로 주입할 수도 있습니다.

`nest-study`에서는 Repository를 직접 클래스 타입으로 주입하지 않고, `POSTS_REPOSITORY` 토큰으로 주입합니다.

```ts
export const POSTS_REPOSITORY = Symbol('POSTS_REPOSITORY');
```

모듈에서는 이 토큰에 실제 구현체를 연결합니다.

```ts
@Module({
  providers: [
    {
      provide: POSTS_REPOSITORY,
      useClass: InMemoryPostsRepository,
    },
  ],
})
export class PostsModule {}
```

Service에서는 토큰으로 주입받습니다.

```ts
@Injectable()
export class PostsService {
  constructor(
    @Inject(POSTS_REPOSITORY)
    private readonly postsRepository: PostsRepository,
  ) {}
}
```

이 구조의 장점은 Service가 특정 구현체에 강하게 묶이지 않는다는 것입니다.

```text
PostsService
  -> POSTS_REPOSITORY 토큰에 의존
  -> 실제 구현체는 Module에서 결정
```

나중에 DB를 쓰고 싶으면 Module 설정만 바꾸면 됩니다.

```ts
{
  provide: POSTS_REPOSITORY,
  useClass: TypeOrmPostsRepository,
}
```

### 의존성 주입의 장점

- 객체 생성 책임을 Nest 컨테이너가 관리
- 테스트에서 mock 객체로 교체하기 쉬움
- Service가 구체적인 저장소 구현에 덜 의존
- 기능 단위의 결합도를 낮춤
- Repository, 외부 API Client, 설정 객체 등을 일관된 방식으로 주입 가능

### 전체 흐름 예시

```text
1. Client가 POST /posts 요청
2. PostsController.create() 실행
3. PostsController가 PostsService.create() 호출
4. PostsService가 postsRepository.create() 호출
5. Repository가 데이터를 저장
6. 결과가 Controller를 통해 Client에게 응답
```

## NestJS 데코레이터

데코레이터는 클래스, 메서드, 파라미터 등에 메타데이터를 붙이는 문법입니다.

NestJS는 이 메타데이터를 읽어서 라우팅, 의존성 주입, 요청 데이터 바인딩 같은 동작을 구성합니다.

예를 들어 아래 코드는 `PostsController`가 `/posts` 경로의 요청을 처리한다는 정보를 Nest에 알려줍니다.

```ts
import { Controller, Get } from '@nestjs/common';

@Controller('posts')
export class PostsController {
  @Get()
  findAll() {
    return [];
  }
}
```

### 자주 쓰는 데코레이터

| 데코레이터 | 위치 | 역할 |
| --- | --- | --- |
| `@Module()` | 클래스 | Nest 모듈을 정의 |
| `@Controller()` | 클래스 | HTTP 요청을 처리하는 컨트롤러 정의 |
| `@Injectable()` | 클래스 | DI 컨테이너에 등록 가능한 provider 정의 |
| `@Get()` | 메서드 | GET 요청 라우팅 |
| `@Post()` | 메서드 | POST 요청 라우팅 |
| `@Patch()` | 메서드 | PATCH 요청 라우팅 |
| `@Delete()` | 메서드 | DELETE 요청 라우팅 |
| `@Body()` | 파라미터 | 요청 body 값 주입 |
| `@Param()` | 파라미터 | URL path parameter 값 주입 |
| `@Query()` | 파라미터 | query string 값 주입 |

### `@Module()`

모듈은 관련된 Controller와 Service를 묶는 단위입니다.

```ts
import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
```

### `@Controller()`

컨트롤러는 HTTP 요청을 받는 진입점입니다.

```ts
@Controller('posts')
export class PostsController {}
```

위 코드는 `/posts`로 시작하는 요청을 이 컨트롤러가 처리한다는 뜻입니다.

### HTTP 메서드 데코레이터

```ts
@Controller('posts')
export class PostsController {
  @Get()
  findAll() {
    return '게시글 목록';
  }

  @Post()
  create() {
    return '게시글 생성';
  }

  @Patch(':id')
  update() {
    return '게시글 수정';
  }

  @Delete(':id')
  remove() {
    return '게시글 삭제';
  }
}
```

라우트는 아래처럼 매핑됩니다.

| 코드 | 실제 경로 |
| --- | --- |
| `@Get()` | `GET /posts` |
| `@Post()` | `POST /posts` |
| `@Patch(':id')` | `PATCH /posts/:id` |
| `@Delete(':id')` | `DELETE /posts/:id` |

### `@Body()`

요청 body 값을 메서드 파라미터로 받습니다.

```ts
@Post()
create(@Body() dto: CreatePostDto) {
  return this.postsService.create(dto);
}
```

아래 요청의 JSON body가 `dto`에 들어옵니다.

```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"첫 게시글","content":"내용"}'
```

### `@Param()`

URL 경로에 들어간 값을 가져옵니다.

```ts
@Get(':id')
findOne(@Param('id') id: string) {
  return this.postsService.findOne(id);
}
```

요청:

```text
GET /posts/123
```

이 경우 `id` 값은 `"123"`입니다.

### `@Query()`

쿼리스트링 값을 가져옵니다.

```ts
@Get()
findAll(@Query() query: PostQueryDto) {
  return this.postsService.findAll(query);
}
```

요청:

```text
GET /posts?page=1&limit=10&keyword=nest
```

이 경우 `query`에는 `page`, `limit`, `keyword` 값이 들어옵니다.

### `@Injectable()`

Service나 Repository처럼 Nest DI 컨테이너가 생성하고 주입할 수 있는 클래스를 표시합니다.

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class PostsService {
  findAll() {
    return [];
  }
}
```

컨트롤러에서는 생성자 주입으로 사용할 수 있습니다.

```ts
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}
}
```

## 데코레이터 요약

- NestJS는 데코레이터를 통해 클래스와 메서드의 역할을 파악합니다.
- `@Controller()`와 HTTP 메서드 데코레이터는 라우팅을 정의합니다.
- `@Body()`, `@Param()`, `@Query()`는 요청 데이터를 메서드 파라미터로 바인딩합니다.
- `@Injectable()`은 DI 대상 클래스를 표시합니다.
- `@Module()`은 관련 구성요소를 하나의 기능 단위로 묶습니다.

## Nest 애플리케이션 실행 흐름

NestJS의 흐름은 단순히 파일을 위에서 아래로 실행하는 것과는 조금 다릅니다.

정확히는 `main.ts`에서 애플리케이션을 시작하면, Nest가 루트 모듈부터 읽고 모듈 그래프를 분석한 뒤 Controller, Service, Provider를 등록합니다.

### 앱이 시작될 때

현재 프로젝트 기준 부팅 흐름은 아래와 같습니다.

```text
main.ts
  -> AppModule
  -> PostsModule
  -> PostsController / PostsService / Repository provider 등록
  -> 라우트 등록
  -> app.listen(3000)
```

### 1. main.ts

`main.ts`는 애플리케이션의 시작점입니다.

```ts
const app = await NestFactory.create(AppModule);
await app.listen(3000);
```

여기서 `AppModule`을 루트 모듈로 넘기면 Nest가 애플리케이션 구성을 시작합니다.

### 2. AppModule

`AppModule`은 루트 모듈입니다.

```ts
@Module({
  imports: [PostsModule],
})
export class AppModule {}
```

Nest는 `imports`에 등록된 `PostsModule`도 함께 읽습니다.

### 3. PostsModule

`PostsModule`은 게시글 기능과 관련된 구성요소를 묶습니다.

```ts
@Module({
  controllers: [PostsController],
  providers: [
    PostsService,
    {
      provide: POSTS_REPOSITORY,
      useClass: InMemoryPostsRepository,
    },
  ],
})
export class PostsModule {}
```

이 단계에서 Nest는 아래 정보를 등록합니다.

- `PostsController`: HTTP 요청을 받을 Controller
- `PostsService`: 비즈니스 로직을 처리할 Service
- `POSTS_REPOSITORY`: 실제 Repository 구현체와 연결된 injection token

### 4. PostsController

Controller 파일의 메서드가 앱 시작과 동시에 실행되는 것은 아닙니다.

Nest는 데코레이터 메타데이터를 읽어서 라우팅 테이블을 구성합니다.

```ts
@Controller('posts')
export class PostsController {
  @Get()
  findAll() {
    return this.postsService.findAll(query);
  }
}
```

위 코드를 보고 Nest는 아래 라우트를 등록합니다.

```text
GET /posts -> PostsController.findAll()
```

중요한 점은 `findAll()`이 서버 시작 시 바로 실행되지 않는다는 것입니다.

`findAll()`은 실제로 `GET /posts` 요청이 들어왔을 때 실행됩니다.

## 요청이 들어왔을 때

앱 시작이 끝난 뒤, 클라이언트가 HTTP 요청을 보내면 그때 Controller 메서드가 실행됩니다.

예를 들어:

```text
GET /posts?page=1&limit=10
```

요청 처리 흐름은 아래와 같습니다.

```text
Client request
  -> PostsController.findAll()
  -> PostsService.findAll()
  -> PostsRepository.findAll()
  -> Controller를 통해 response 반환
```

게시글 생성 요청도 비슷합니다.

```text
POST /posts
  -> PostsController.create()
  -> PostsService.create()
  -> PostsRepository.create()
  -> 생성된 게시글 응답
```

## 정리

- `main.ts`는 Nest 애플리케이션의 시작점입니다.
- `AppModule`은 루트 모듈입니다.
- `PostsModule`은 게시글 기능 단위의 모듈입니다.
- `PostsController`는 앱 시작 시 라우트로 등록됩니다.
- Controller 메서드는 서버 시작 시 실행되지 않고, 실제 HTTP 요청이 들어왔을 때 실행됩니다.
- 요청이 들어오면 Controller -> Service -> Repository 순서로 흘러갑니다.
