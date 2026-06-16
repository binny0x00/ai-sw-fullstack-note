# Chunk 전략

## 목적

문서를 검색하기 좋은 단위로 나누기 위한 기준을 정리합니다.

RAG에서는 문서 전체를 한 번에 임베딩하지 않고, 적절한 크기의 chunk로 나누어
저장합니다. 이렇게 하면 사용자의 질문과 관련 있는 부분만 검색해서 답변에
활용할 수 있습니다.

## 기본 설정

초기에는 복잡한 전략보다 단순한 고정 길이 기반 chunking을 사용합니다.

- chunk size: 500~800자
- overlap: 100~150자

## Chunk Size

chunk size는 하나의 조각에 들어가는 글자 수를 의미합니다.

너무 작으면 문맥이 부족해지고, 너무 크면 검색 결과에 불필요한 내용이 많이
섞일 수 있습니다.

초기 기준은 500~800자로 둡니다.

## Overlap

overlap은 chunk 사이에 겹치는 글자 수를 의미합니다.

문장이 chunk 경계에서 끊기면 의미가 사라질 수 있기 때문에, 앞뒤 chunk가 일부
내용을 공유하도록 만듭니다.

초기 기준은 100~150자로 둡니다.

## Metadata

chunk마다 metadata를 함께 저장합니다.

metadata는 검색 결과의 출처를 표시하거나, 문서 타입별로 필터링할 때
사용합니다.

필수 metadata는 다음과 같습니다.

| 필드 | 설명 | 예시 |
| --- | --- | --- |
| `source` | 원본 파일명 | `cors-error.md` |
| `title` | 문서 제목 | `CORS 에러 정리` |
| `type` | 문서 유형 | `faq`, `api`, `past_issue`, `manual` |

## Metadata 예시

```json
{
  "source": "cors-error.md",
  "title": "CORS 에러 정리",
  "type": "past_issue"
}
```

## 문서별 Type 기준

| type | 용도 |
| --- | --- |
| `faq` | 자주 묻는 질문 |
| `api` | API 명세 또는 API 사용법 |
| `past_issue` | 과거에 겪은 에러와 해결 기록 |
| `manual` | 사용법, 개념 정리, 운영 가이드 |

## 파일별 Type 예시

| 파일명 | type |
| --- | --- |
| `cors-error.md` | `past_issue` |
| `auth-login-api.md` | `api` |
| `jwt-expired.md` | `past_issue` |
| `faq.md` | `faq` |
| `chunk-strategy.md` | `manual` |

## 답변 출처 표시

검색된 chunk의 metadata를 이용하면 답변에 근거 문서를 붙일 수 있습니다.

예시:

```text
근거 문서: cors-error.md
```

여러 문서를 참고한 경우:

```text
근거 문서: cors-error.md, faq.md
```

## 초기 구현 방향

처음부터 복잡한 문단 분석이나 의미 기반 chunking을 적용하지 않습니다.

초기에는 다음 순서로 구현합니다.

1. Markdown 파일을 읽습니다.
2. 제목을 추출합니다.
3. 본문을 500~800자 단위로 나눕니다.
4. chunk 사이에 100~150자 overlap을 둡니다.
5. 각 chunk에 `source`, `title`, `type` metadata를 붙입니다.
6. 임베딩 후 vector DB에 저장합니다.

## 주의사항

- chunk에는 반드시 `source` metadata를 넣습니다.
- `title`이 없으면 파일명을 title로 사용합니다.
- `type`은 파일명이나 폴더 규칙으로 자동 지정할 수 있습니다.
- 답변 생성 시 검색된 chunk의 `source`를 함께 반환합니다.
