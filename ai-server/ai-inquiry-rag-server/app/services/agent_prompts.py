from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI


def build_analysis_chain(llm: ChatOpenAI, ai_settings: dict):
    custom_instructions = ai_settings.get("custom_instructions") or "없음"
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                (
                    "너는 문의 처리 관리자 시스템의 AI Agent다. "
                    "RAG 참고 문서와 GitHub Issue 조회 결과를 근거로 문의 유형, "
                    "긴급도, 답변 초안, 외부 액션 필요 여부를 판단한다. "
                    "문의 유형은 bug, feature_request, question, account, "
                    "other 중 하나다. 긴급도는 low, medium, high 중 하나다. "
                    "suggested_action은 github_issue_recommended, "
                    "answer_only, needs_human_review 중 하나다. "
                    "answer_draft는 담당자가 사용자에게 남길 수 있는 답변 초안이다. "
                    "자동로그인, 알림, 검색 개선, UI 개선처럼 새 기능 추가나 기존 기능 개선을 "
                    "요청하는 문의는 inquiry_type을 feature_request로, suggested_action을 "
                    "github_issue_recommended로 판단한다. "
                    "재현 가능한 버그, 운영 장애, 개발 작업이 필요한 설정 누락도 "
                    "suggested_action을 github_issue_recommended로 판단한다. "
                    f"답변 톤 정책: {ai_settings['answer_tone']} "
                    f"기술 이슈 처리 정책: {ai_settings['technical_issue_policy']} "
                    f"외부 액션 판단 정책: {ai_settings['escalation_policy']} "
                    f"추가 운영 지침: {custom_instructions} "
                    "반드시 json 객체로만 답변한다."
                ),
            ),
            (
                "user",
                (
                    "문의 제목:\n{title}\n\n"
                    "문의 내용:\n{body}\n\n"
                    "참고 문서:\n{context}\n\n"
                    "GitHub Issue 조회 결과:\n{mcp_context}\n\n"
                    "json 필드: inquiry_type, urgency, answer_draft, "
                    "suggested_action"
                ),
            ),
        ]
    )

    return prompt | llm | JsonOutputParser()


def build_doc_recommendation_chain(llm: ChatOpenAI):
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                (
                    "너는 Todo 앱 고객지원 지식베이스 관리자다. "
                    "문의와 RAG 참고 문서를 비교해 기존 .md 문서에 추가하거나 "
                    "수정하면 좋은 내용을 추천한다. "
                    "추천은 최대 3개로 제한한다. "
                    "반드시 실제 참고 문서의 .md 파일명을 file에 넣고, "
                    "그 파일에 추가할 보강 내용을 suggestion에 짧게 제안한다. "
                    "수정할 .md 파일을 특정할 수 없거나 이미 충분히 문서화되어 있으면 "
                    "빈 배열을 반환한다. "
                    "반드시 json 객체로만 답변한다."
                ),
            ),
            (
                "user",
                (
                    "문의 제목:\n{title}\n\n"
                    "문의 내용:\n{body}\n\n"
                    "RAG 참고 문서:\n{context}\n\n"
                    "AI 분석 결과:\n{analysis}\n\n"
                    "json 필드: recommendations"
                ),
            ),
        ]
    )

    return prompt | llm | JsonOutputParser()


def build_post_precheck_chain(llm: ChatOpenAI):
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                (
                    "너는 Todo 앱 고객 문의 게시판의 접수 전 점검 담당자다. "
                    "사용자가 게시글을 등록하기 전에 제목, 본문, 태그만 보고 "
                    "담당자가 답변하거나 개발팀이 재현하는 데 필요한 정보가 충분한지 판단한다. "
                    "RAG 참고 문서는 질문을 구체화하는 근거로만 사용한다. "
                    "단순 사용 문의나 명확한 기능 요청은 막지 말고 needs_more_info를 false로 둔다. "
                    "버그 신고는 고객이 문제 상황을 한두 문장으로 적었다면 접수 가능하다고 판단한다. "
                    "예를 들어 '앱을 켠 직후 로딩 화면에서 가끔 멈춘다'처럼 발생 시점과 증상이 있으면 "
                    "needs_more_info를 false로 둔다. "
                    "내용이 '안돼요', '오류나요'처럼 대상 기능이나 증상이 거의 없는 경우에만 "
                    "needs_more_info를 true로 둔다. "
                    "고객에게 앱 버전, 브라우저, OS, 네트워크 상태, 다른 기기 재현 여부, "
                    "캐시 삭제, 재설치 같은 기술 확인이나 조치를 요구하지 않는다. "
                    "재현이 어렵다, 원인 파악이 어렵다, 개발팀이 분석하기 어렵다처럼 "
                    "고객에게 책임을 돌리는 표현을 쓰지 않는다. "
                    "questions는 사용자가 기억으로 바로 답할 수 있는 쉬운 한국어 질문으로 최대 2개만 작성한다. "
                    "예: 어떤 버튼을 누른 뒤 문제가 생겼나요?, 화면에 어떤 문구가 보였나요? "
                    "suggested_content는 기존 본문 뒤에 붙이면 자연스러운 보강 템플릿으로 작성한다. "
                    "category는 bug, feature_request, question, account, other 중 하나다. "
                    "반드시 json 객체로만 답변한다."
                ),
            ),
            (
                "user",
                (
                    "게시글 제목:\n{title}\n\n"
                    "게시글 내용:\n{content}\n\n"
                    "태그:\n{tags}\n\n"
                    "참고 문서:\n{context}\n\n"
                    "json 필드: needs_more_info, questions, suggested_content, reason, category"
                ),
            ),
        ]
    )

    return prompt | llm | JsonOutputParser()
