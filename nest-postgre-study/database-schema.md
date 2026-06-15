# PostgreSQL 테이블 구성

이 프로젝트는 TypeORM 설정에서 `synchronize: false`를 사용합니다.

즉 Nest 애플리케이션이 테이블을 자동으로 만들지 않습니다. 아래 SQL을 PostgreSQL에 직접 실행해서 테이블을 준비해야 합니다.

## 데이터베이스 생성

필요하다면 먼저 데이터베이스를 생성합니다.

```sql
CREATE DATABASE nest_postgre_study;
```

이후 해당 데이터베이스에 접속한 뒤 아래 테이블 SQL을 실행합니다.

## posts 테이블

```sql
CREATE TABLE posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title varchar(120) NOT NULL,
    content text NOT NULL,
    tags text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

컬럼 설명:

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `uuid` | 게시글 고유 id |
| `title` | `varchar(120)` | 게시글 제목 |
| `content` | `text` | 게시글 본문 |
| `tags` | `text[]` | 문자열 태그 배열 |
| `created_at` | `timestamptz` | 생성 시각 |
| `updated_at` | `timestamptz` | 수정 시각 |

## gen_random_uuid()가 없을 때

`gen_random_uuid()`를 사용하려면 PostgreSQL의 `pgcrypto` 확장이 필요할 수 있습니다.

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

그 후 `posts` 테이블을 생성하면 됩니다.

## updated_at 자동 갱신

PostgreSQL은 `updated_at`을 자동으로 바꾸려면 trigger가 필요합니다.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE TRIGGER posts_update_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

TypeORM의 `@UpdateDateColumn`도 저장 시점에 값을 갱신하지만, DB에서도 보장하고 싶다면 trigger를 추가하는 것이 좋습니다.

## 전체 SQL

처음부터 한 번에 실행하려면 아래 SQL을 사용합니다.

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title varchar(120) NOT NULL,
    content text NOT NULL,
    tags text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_update_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```
