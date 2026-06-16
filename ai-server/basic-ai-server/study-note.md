# Study Note

## Chroma와 ChromaDB의 역할

## 1. Chroma란?

Chroma는 AI 애플리케이션에서 벡터 검색을 쉽게 사용할 수 있게 해주는 오픈소스
벡터 데이터베이스 도구입니다.

RAG를 구현할 때 문서를 임베딩으로 바꾼 뒤 저장하고, 사용자의 질문과 비슷한
문서 조각을 검색하는 역할을 합니다.

쉽게 말하면 Chroma는 다음 일을 담당합니다.

- 문서 chunk의 embedding 저장
- 사용자 질문 embedding과 유사한 문서 검색
- 검색 결과와 metadata 반환
- RAG에서 LLM에게 전달할 근거 문서 제공

## 2. ChromaDB란?

ChromaDB는 Chroma의 데이터베이스 기능을 가리키는 이름으로 볼 수 있습니다.

Python에서는 보통 `chromadb` 패키지를 설치해서 사용합니다.

```bash
pip install chromadb
```

즉, 개념적으로는 다음처럼 이해하면 됩니다.

```text
Chroma = 벡터 DB 도구 / 프로젝트 이름
ChromaDB = Chroma가 제공하는 벡터 데이터베이스
chromadb = Python에서 사용하는 ChromaDB 패키지 이름
```

실무나 문서에서는 `Chroma`, `ChromaDB`, `chromadb`가 비슷한 의미로 섞여
사용되는 경우가 많습니다.

## 3. RAG에서 ChromaDB가 필요한 이유

LLM은 질문을 받으면 자체 지식만으로 답변을 만들 수 있습니다. 하지만 프로젝트
내부 문서, FAQ, 과거 문의 사례처럼 LLM이 모르는 정보는 직접 알 수 없습니다.

RAG는 이 문제를 해결하기 위해 외부 문서를 검색해서 LLM에게 함께 전달합니다.

이때 ChromaDB는 검색 대상 문서를 저장하고 찾아주는 역할을 합니다.

```text
문서 작성
  ↓
문서를 chunk로 나눔
  ↓
각 chunk를 embedding으로 변환
  ↓
ChromaDB에 저장
  ↓
사용자 문의를 embedding으로 변환
  ↓
ChromaDB에서 유사한 chunk 검색
  ↓
검색 결과를 LLM에게 전달
  ↓
근거 기반 답변 생성
```

## 4. Embedding과 Vector DB의 관계

Embedding은 문장이나 문서를 숫자 배열로 바꾼 값입니다.

예를 들어 아래 문장들은 의미가 비슷합니다.

```text
로그인이 안 됩니다.
로그인 버튼을 눌러도 반응이 없습니다.
로그인 API 호출에 실패합니다.
```

이 문장들을 embedding으로 바꾸면 의미가 비슷한 문장끼리 벡터 공간에서 가까운
위치에 놓입니다.

ChromaDB는 이런 embedding을 저장해 두었다가, 새 질문이 들어오면 가장 가까운
embedding을 가진 문서를 찾아줍니다.

## 5. 이 프로젝트에서의 역할

이 프로젝트에서는 ChromaDB를 RAG 검색 저장소로 사용할 수 있습니다.

저장할 데이터 예시는 다음과 같습니다.

- `docs/faq.md`
- `docs/cors-error.md`
- `docs/auth-login-api.md`
- `docs/jwt-expired.md`
- 과거 문의 데이터
- 운영 매뉴얼

각 문서는 chunk로 나눈 뒤 embedding과 metadata를 함께 저장합니다.

```json
{
  "id": "cors-error-001",
  "document": "CORS는 브라우저가 서로 다른 출처 간 요청을 제한하는 정책입니다.",
  "embedding": [0.12, -0.03, 0.45],
  "metadata": {
    "source": "cors-error.md",
    "title": "CORS 에러 정리",
    "type": "past_issue"
  }
}
```

사용자가 문의를 작성하면 FastAPI AI 서버는 문의 내용을 embedding으로 바꾸고,
ChromaDB에서 비슷한 문서 chunk를 검색합니다.

## 6. ChromaDB가 반환하는 것

ChromaDB 검색 결과에는 보통 다음 정보가 포함됩니다.

- 검색된 문서 내용
- 유사도 점수 또는 거리
- 문서 ID
- metadata

예시:

```json
{
  "documents": [
    "CORS 에러는 백엔드에서 origin을 허용하지 않았을 때 발생할 수 있습니다."
  ],
  "metadatas": [
    {
      "source": "cors-error.md",
      "title": "CORS 에러 정리",
      "type": "past_issue"
    }
  ],
  "distances": [0.18]
}
```

AI Agent는 이 결과를 바탕으로 답변 초안을 만들고, 답변에 근거 문서를 표시할 수
있습니다.

```text
근거 문서: cors-error.md, auth-login-api.md
```

## 7. PostgreSQL + pgvector와의 차이

ChromaDB와 PostgreSQL + pgvector는 둘 다 벡터 검색에 사용할 수 있습니다.

| 구분 | ChromaDB | PostgreSQL + pgvector |
| --- | --- | --- |
| 목적 | 벡터 검색을 빠르게 실습하기 좋음 | 기존 RDB와 벡터 검색을 함께 운영하기 좋음 |
| 설정 난이도 | 낮음 | 상대적으로 높음 |
| 데이터 관리 | 문서/embedding 중심 | 테이블, 관계, 트랜잭션 중심 |
| 학습용 적합성 | 높음 | 중간 |
| 운영 확장성 | 프로젝트 규모에 따라 검토 필요 | 기존 DB 운영 경험을 활용하기 좋음 |

초기 학습 단계에서는 ChromaDB로 RAG 흐름을 빠르게 이해하고, 이후 데이터 관계나
운영 구조가 중요해지면 PostgreSQL + pgvector로 확장하는 방식이 좋습니다.

## 8. FastAPI에서 사용하는 흐름

FastAPI AI 서버에서는 보통 다음 흐름으로 사용합니다.

1. 서버 시작 시 ChromaDB client를 준비합니다.
2. `docs/` 문서를 읽습니다.
3. 문서를 chunk로 나눕니다.
4. embedding을 생성합니다.
5. ChromaDB collection에 저장합니다.
6. 문의가 들어오면 문의 embedding을 생성합니다.
7. collection에서 유사 문서를 검색합니다.
8. 검색 결과를 LLM 프롬프트에 포함합니다.
9. 답변 초안과 출처를 반환합니다.

## 9. 핵심 정리

```text
Embedding = 문서를 숫자 벡터로 바꾼 값
Vector DB = embedding을 저장하고 유사한 벡터를 검색하는 DB
ChromaDB = RAG 구현에 자주 쓰이는 벡터 DB
RAG = ChromaDB에서 찾은 근거 문서를 LLM 답변에 활용하는 방식
```

이 프로젝트에서 ChromaDB는 AI Agent가 직접 판단하는 주체가 아닙니다.

역할을 구분하면 다음과 같습니다.

```text
AI Agent = 문의를 분석하고 다음 행동을 판단
RAG = 관련 문서를 검색해서 근거 제공
ChromaDB = RAG 검색을 위해 embedding을 저장하고 조회
MCP = GitHub Issue 생성 같은 외부 도구 실행
```
