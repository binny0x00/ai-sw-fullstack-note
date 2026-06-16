# 03. RAG 성능과 품질 평가

## 1. 평가 대상

FastAPI AI 서버의 LangChain RAG 구성을 평가합니다.

관련 코드:

```text
ai-server/ai-inquiry-rag-server/app/rag/loader.py
ai-server/ai-inquiry-rag-server/app/rag/splitter.py
ai-server/ai-inquiry-rag-server/app/rag/embeddings.py
ai-server/ai-inquiry-rag-server/app/rag/vector_store.py
ai-server/ai-inquiry-rag-server/app/rag/service.py
ai-server/ai-inquiry-rag-server/scripts/ingest_docs.py
```

사용 기술:

```text
LangChain Document
RecursiveCharacterTextSplitter
OpenAIEmbeddings
LangChain PGVector
PostgreSQL pgvector
```

## 2. 평가 전 확인

관리자 화면 또는 API로 RAG 상태를 확인합니다.

```text
GET /rag/status
```

확인 항목:

- `ready`가 `true`인가?
- `embedding_count`가 0보다 큰가?
- `collection_name`이 설정값과 같은가?

## 3. 검색 품질 기준

RAG 검색은 정확한 답을 생성하는 단계가 아니라, LLM에게 줄 참고 문서를
찾는 단계입니다. 따라서 아래 기준으로 평가합니다.

| 기준 | 설명 |
| --- | --- |
| Top-1 적중 | 가장 첫 결과가 질문과 직접 관련 있는가 |
| Top-3 적중 | 상위 3개 안에 관련 문서가 있는가 |
| 근거 충분성 | 답변 생성에 필요한 정보가 검색 결과에 포함되는가 |
| 노이즈 | 관련 없는 문서가 너무 많이 섞이지 않는가 |
| 응답 시간 | 검색 결과가 실시간 사용에 적절한 속도로 반환되는가 |

## 4. 테스트 질의 세트

| 질의 | 기대 문서 |
| --- | --- |
| 로그인 버튼을 눌러도 반응이 없고 CORS 에러가 나요 | CORS, 로그인 API 관련 문서 |
| JWT가 만료되면 사용자는 어떻게 해야 하나요 | JWT 만료 대응 문서 |
| 자동 로그인 기능을 추가하고 싶어요 | 기능 요청 또는 인증 관련 문서 |
| 게시글 검색 결과가 이상해요 | 검색 또는 게시판 관련 문서 |
| 비밀번호를 잊어버렸어요 | 계정 또는 인증 관련 문서 |

## 5. 측정 방법

```text
1. 테스트 질의를 준비한다.
2. /rag/search API를 호출한다.
3. Top-K 결과의 source, title, category를 기록한다.
4. 관련 문서가 몇 번째에 등장했는지 기록한다.
5. 응답 시간을 기록한다.
```

## 6. 결과 기록 양식

| 질의 | Top-1 관련 | Top-3 관련 | 응답 시간 | 평가 |
| --- | --- | --- | ---: | --- |
| 로그인 CORS 오류 |  |  |  |  |
| JWT 만료 |  |  |  |  |
| 자동 로그인 요청 |  |  |  |  |
| 검색 결과 문제 |  |  |  |  |
| 비밀번호 분실 |  |  |  |  |

## 7. 개선 포인트

검색 품질이 낮다면 아래 순서로 점검합니다.

```text
1. RAG 문서가 충분한가?
2. 문서 title, category, source metadata가 적절한가?
3. chunk_size와 overlap이 너무 작거나 크지 않은가?
4. query가 게시글 제목과 본문을 충분히 포함하는가?
5. Embedding 모델이 언어와 도메인에 적합한가?
```

## 8. 주의사항

- 검색 결과가 좋아도 Agent 답변이 항상 좋은 것은 아닙니다.
- 반대로 Agent 답변이 좋아 보여도 RAG 근거가 부족하면 신뢰성이 낮습니다.
- RAG 평가는 답변 품질 평가와 분리해서 기록해야 원인을 찾기 쉽습니다.

