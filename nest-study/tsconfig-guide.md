# tsconfig.json 설명

`tsconfig.json`은 TypeScript 컴파일러가 프로젝트를 어떻게 해석하고 검사하고 빌드할지 정하는 설정 파일입니다.

NestJS 프로젝트에서는 특히 데코레이터, 의존성 주입, 타입 검사 수준과 관련된 설정이 중요합니다.

## 전체 구조

```json
{
  "compilerOptions": {},
  "include": []
}
```

- `compilerOptions`: TypeScript 컴파일러 옵션입니다.
- `include`: 어떤 파일을 컴파일 대상으로 포함할지 지정합니다.

## compilerOptions

### `module`

```json
"module": "commonjs"
```

컴파일된 JavaScript가 사용할 모듈 시스템을 지정합니다.

NestJS는 Node.js 환경에서 실행되므로 CommonJS 방식이 널리 사용됩니다.

```ts
import { Module } from '@nestjs/common';
```

위 TypeScript import는 빌드 후 CommonJS 환경에서 동작할 수 있는 형태로 변환됩니다.

### `declaration`

```json
"declaration": true
```

빌드할 때 `.d.ts` 타입 선언 파일을 생성합니다.

라이브러리처럼 다른 코드에서 타입 정보를 참조해야 할 때 유용합니다. 일반 애플리케이션에서는 필수는 아니지만, 타입 산출물을 확인할 수 있습니다.

### `removeComments`

```json
"removeComments": true
```

빌드 결과 JavaScript에서 주석을 제거합니다.

소스 코드는 그대로 유지되고, `dist`에 생성되는 결과물에서만 주석이 제거됩니다.

### `experimentalDecorators`

```json
"experimentalDecorators": true
```

TypeScript 데코레이터 문법을 사용할 수 있게 합니다.

NestJS는 데코레이터 기반 프레임워크이므로 이 설정이 중요합니다.

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

### `emitDecoratorMetadata`

```json
"emitDecoratorMetadata": true
```

데코레이터와 함께 타입 메타데이터를 런타임에 남깁니다.

NestJS의 의존성 주입은 이 메타데이터를 활용합니다.

```ts
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}
}
```

Nest는 생성자 파라미터의 타입 정보를 보고 `PostsService`를 주입할 수 있습니다.

### `allowSyntheticDefaultImports`

```json
"allowSyntheticDefaultImports": true
```

TypeScript 타입 검사 단계에서 default export가 없는 모듈을 default import처럼 가져오는 문법을 허용합니다.

예를 들어 어떤 CommonJS 라이브러리가 내부적으로 아래처럼 export되어 있다고 가정합니다.

```js
module.exports = {
  hash() {},
  compare() {},
};
```

이 라이브러리는 엄밀히 말하면 ES Module의 `default export`를 가진 것이 아닙니다. 그래서 원칙적으로는 이런 형태가 더 정확합니다.

```ts
import * as bcrypt from 'bcrypt';
```

하지만 `allowSyntheticDefaultImports`가 켜져 있으면 TypeScript가 아래 문법도 타입 검사 단계에서 허용합니다.

```ts
import bcrypt from 'bcrypt';
```

여기서 `synthetic default import`는 "실제로 default export가 있는 것은 아니지만, default import처럼 쓰는 문법을 타입상 허용한다"는 의미입니다.

주의할 점은 이 옵션이 JavaScript 출력 방식을 직접 바꾸는 옵션은 아니라는 것입니다. 런타임 모듈 호환성까지 다루려면 보통 `esModuleInterop` 같은 옵션도 함께 검토합니다.

### `target`

```json
"target": "ES2023"
```

컴파일 결과 JavaScript가 어느 ECMAScript 버전을 기준으로 할지 정합니다.

`ES2023`은 비교적 최신 Node.js 환경을 기준으로 합니다.

### `sourceMap`

```json
"sourceMap": true
```

빌드 결과와 원본 TypeScript 파일을 연결하는 source map 파일을 생성합니다.

런타임 에러가 발생했을 때 빌드된 JavaScript가 아니라 원본 TypeScript 위치를 추적하는 데 도움이 됩니다.

### `outDir`

```json
"outDir": "./dist"
```

빌드 결과물이 생성될 폴더입니다.

```text
src/main.ts -> dist/main.js
```

### `baseUrl`

```json
"baseUrl": "./"
```

모듈 경로 해석의 기준 디렉터리를 지정합니다.

이 프로젝트에서는 프로젝트 루트가 기준입니다.

### `incremental`

```json
"incremental": true
```

이전 컴파일 정보를 저장해서 다음 컴파일을 더 빠르게 합니다.

TypeScript는 `tsconfig.tsbuildinfo` 같은 파일에 빌드 정보를 저장할 수 있습니다.

### `strict`

```json
"strict": true
```

TypeScript의 엄격한 타입 검사 옵션들을 활성화합니다.

실무 코드에서는 런타임 버그를 줄이기 위해 가능한 켜두는 것이 좋습니다.

예를 들어 `undefined` 가능성, 암시적 any, 잘못된 타입 사용을 더 엄격히 잡습니다.

### `skipLibCheck`

```json
"skipLibCheck": true
```

설치된 라이브러리의 `.d.ts` 타입 선언 파일 검사를 건너뜁니다.

프로젝트 코드의 타입 검사는 유지하면서 외부 라이브러리 타입 검사 비용을 줄일 수 있습니다.

### `noImplicitAny`

```json
"noImplicitAny": true
```

타입을 추론할 수 없어 `any`가 암시적으로 생기는 것을 막습니다.

```ts
// 에러 가능
function updatePost(dto) {
  return dto;
}
```

명시적으로 타입을 써야 합니다.

```ts
function updatePost(dto: UpdatePostDto) {
  return dto;
}
```

### `strictBindCallApply`

```json
"strictBindCallApply": true
```

`bind`, `call`, `apply`를 사용할 때 함수 인자 타입을 엄격하게 검사합니다.

일반 CRUD 코드에서 자주 직접 만지지는 않지만, 함수 호출 안정성을 높입니다.

### `forceConsistentCasingInFileNames`

```json
"forceConsistentCasingInFileNames": true
```

파일 이름의 대소문자 사용이 import 경로와 일치하는지 검사합니다.

운영체제마다 파일 시스템의 대소문자 처리 방식이 다를 수 있어, 팀 개발에서 중요한 옵션입니다.

### `noFallthroughCasesInSwitch`

```json
"noFallthroughCasesInSwitch": true
```

`switch` 문에서 `break` 없이 다음 case로 이어지는 실수를 막습니다.

```ts
switch (status) {
  case 'draft':
    return '임시 저장';
  case 'published':
    return '게시됨';
}
```

## include

```json
"include": ["src/**/*.ts"]
```

`src` 폴더 아래의 모든 TypeScript 파일을 컴파일 대상으로 포함합니다.

```text
src/main.ts
src/app.module.ts
src/posts/posts.controller.ts
```

위와 같은 파일들이 타입 검사와 빌드 대상이 됩니다.

## 요약

이 설정은 NestJS CRUD 학습 프로젝트에 필요한 기본 TypeScript 환경을 구성합니다.

- Nest 데코레이터 사용 가능
- 의존성 주입을 위한 메타데이터 생성
- 엄격한 타입 검사 적용
- 빌드 결과는 `dist`에 생성
- `src` 아래 TypeScript 파일만 컴파일 대상
