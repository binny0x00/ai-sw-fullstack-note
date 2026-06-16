# 06. 프론트엔드 UX 평가

## 1. 평가 대상

React 클라이언트의 게시판 화면과 관리자 AI 검토 화면을 평가합니다.

관련 코드:

```text
client/basic-client/src/App.tsx
client/basic-client/src/api.ts
client/basic-client/src/pages/LoginPage.tsx
client/basic-client/src/pages/BoardPage.tsx
client/basic-client/src/pages/BoardWritePage.tsx
client/basic-client/src/pages/BoardDetailPage.tsx
client/basic-client/src/pages/css/Board.css
```

## 2. 일반 사용자 UX

확인 항목:

- 회원가입과 로그인이 자연스럽게 이어지는가?
- 로그인 후 게시판으로 이동할 수 있는가?
- 게시글 작성 화면에서 제목, 내용, 태그 입력이 명확한가?
- 게시글 목록에서 검색과 페이징을 사용할 수 있는가?
- 게시글 상세에서 댓글을 작성할 수 있는가?
- 일반 사용자는 관리자 AI 검토 패널을 볼 수 없는가?

## 3. 관리자 UX

확인 항목:

- `MANAGER`로 로그인 후 게시글 상세에 AI 검토 패널이 보이는가?
- RAG 문서 적재 상태가 표시되는가?
- AI 검토 실행 중 버튼 상태가 바뀌는가?
- Agent 판단 결과가 문의 유형, 긴급도, 추천 액션으로 구분되어 보이는가?
- RAG 참고 문서 목록이 보이는가?
- AI 답변 초안을 댓글 입력창에 채워 넣을 수 있는가?
- GitHub Issue 등록은 별도 승인 버튼으로 실행되는가?

## 4. 오류 UX

확인할 오류 상황:

- FastAPI AI 서버가 꺼져 있는 경우
- RAG 문서가 적재되지 않은 경우
- OpenAI API Key가 잘못된 경우
- GitHub Token이 없거나 권한이 부족한 경우
- 일반 사용자가 관리자 API를 호출하는 경우

좋은 오류 UX는 사용자가 다음 행동을 알 수 있어야 합니다.

```text
AI 서버를 실행해야 하는지
RAG 문서를 적재해야 하는지
GitHub Token 설정을 확인해야 하는지
권한이 부족한지
```

## 5. 화면 평가 체크리스트

| 항목 | 통과 |
| --- | --- |
| 모바일 폭에서도 버튼과 텍스트가 겹치지 않는다 |  |
| 관리자 전용 UI가 일반 사용자에게 숨겨진다 |  |
| AI 검토 결과가 원본 게시글과 같은 화면에서 보인다 |  |
| 답변 초안을 바로 댓글 입력창에 반영할 수 있다 |  |
| GitHub Issue 생성은 명시적 승인 후 실행된다 |  |
| 로딩 중 중복 클릭이 방지된다 |  |

## 6. 개선 아이디어

- AI 답변 초안을 댓글 입력창에 넣은 뒤 사용자가 수정했는지 표시한다.
- GitHub Issue 생성 결과에 issue URL을 링크로 표시한다.
- RAG 참고 문서를 클릭하면 상세 내용을 볼 수 있게 한다.
- AI 분석 이력을 게시글 상세에서 다시 열어볼 수 있게 한다.

