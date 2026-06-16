# PostgreSQL pgvector 컨테이너 문의

## 상황

사용자가 매번 Docker 컨테이너를 켜면 DB가 사라지는지 문의한다.

## 확인 포인트

- `docker compose up -d`를 사용하는지 확인한다.
- `docker compose down -v`를 사용했는지 확인한다.
- Docker volume이 유지되고 있는지 확인한다.

## 답변 가이드

`docker compose up -d`는 기존 volume을 재사용하므로 데이터가 유지된다고 안내한다. `down -v`는 volume 삭제로 데이터가 사라진다.

## 개발팀 전달 기준

개발 환경 안내 문서 개선으로 분류한다.
