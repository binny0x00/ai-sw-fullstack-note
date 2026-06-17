# AI Helpdesk Architecture Diagram

이 다이어그램은 AI Helpdesk 게시판의 주요 실행 흐름을 기준으로 정리한 아키텍처입니다.
사용자가 문의 게시글을 작성하면 NestJS가 게시판 데이터를 저장하고, FastAPI AI 서버가
RAG 검색, Agent 분석, MCP GitHub 연동을 처리합니다.

```mermaid
flowchart TB
    user["일반 사용자<br/>문의 작성 / 댓글 확인"]
    manager["관리자<br/>AI 검토 / 댓글 등록 / GitHub Issue 승인"]
    developer["개발자<br/>GitHub Issue 후속 처리"]

    client["React + TypeScript + Vite<br/>client/basic-client<br/>게시판 / 관리자 AI 화면"]
    nest["NestJS + TypeORM API<br/>server/basic-server<br/>인증 / 게시판 / 댓글 / 관리자 API"]
    fastapi["FastAPI AI Server<br/>ai-server/ai-inquiry-rag-server<br/>RAG / Agent / MCP / Observability"]

    postgres[("PostgreSQL<br/>users, posts, comments, tags<br/>inquiries, ai_analysis_results<br/>agent_step_logs, mcp_execution_logs")]
    pgvector[("PostgreSQL pgvector<br/>langchain_pg_collection<br/>langchain_pg_embedding")]

    rag_docs["Markdown Knowledge Base<br/>FAQ / 장애 대응 / 운영 문서<br/>ai-server/.../docs/*.md"]
    rag["LangChain RAG<br/>문서 chunk / embedding / similarity search"]
    agent["LangGraph Agent<br/>문의 분류 / 긴급도 판단<br/>답변 초안 / 처리 방향 생성"]
    openai["OpenAI API<br/>text-embedding-3-small<br/>Chat completion"]

    mcp["MCP GitHub Tools<br/>search_github_issues<br/>create_github_issue_with_project"]
    github["GitHub Issues / Projects<br/>외부 개발 이슈 관리"]
    admin_dashboard["Admin AI Dashboard<br/>RAG 상태 / Agent 단계 로그<br/>API·MCP·LLM 관찰 지표"]

    user -->|"1. 글 작성 / 목록·상세 조회"| client
    manager -->|"관리자 화면 접근"| client
    client -->|"2. REST API + JWT"| nest

    nest -->|"3. 게시글 / 댓글 / 태그 저장"| postgres
    nest -->|"4. 게시글 embedding 동기화"| fastapi
    nest -->|"5. AI 문의 생성 / 분석 요청"| fastapi

    fastapi -->|"6. 문의·분석·실행 로그 저장"| postgres
    rag_docs -->|"7. 문서 적재"| rag
    postgres -->|"게시글 기반 RAG 데이터"| rag
    rag -->|"8. embedding 저장 / 유사도 검색"| pgvector
    rag -->|"검색 근거 전달"| agent

    fastapi --> agent
    agent -->|"9. embedding / 답변 생성"| openai
    agent -->|"10. GitHub 조회 필요 판단"| mcp
    mcp -->|"Issue 검색"| github
    github -->|"유사 이슈 결과"| mcp
    mcp -->|"MCP 결과"| agent
    agent -->|"11. AI 분석 결과 저장"| postgres

    client -->|"12. 최신 AI 검토 결과 조회 / polling"| nest
    nest -->|"공유 DB에서 결과 조회"| postgres
    nest -->|"AI 검토 결과 응답"| client

    manager -->|"13. 답변 초안 검토 후 댓글 등록"| client
    manager -->|"14. 필요 시 GitHub Issue 생성 승인"| client
    client --> nest
    nest -->|"승인 요청 전달"| fastapi
    fastapi --> mcp
    mcp -->|"15. Issue 생성"| github
    github --> developer

    fastapi -->|"16. 관찰 로그 / 요약 지표"| admin_dashboard
    admin_dashboard --> manager

    classDef actor fill:#fff7e6,stroke:#f59e0b,stroke-width:1px,color:#111827;
    classDef app fill:#e0f2fe,stroke:#0284c7,stroke-width:1px,color:#0f172a;
    classDef ai fill:#ede9fe,stroke:#7c3aed,stroke-width:1px,color:#111827;
    classDef data fill:#ecfdf5,stroke:#059669,stroke-width:1px,color:#111827;
    classDef external fill:#fef2f2,stroke:#dc2626,stroke-width:1px,color:#111827;

    class user,manager,developer actor;
    class client,nest,fastapi,admin_dashboard app;
    class rag,agent,openai,mcp ai;
    class postgres,pgvector,rag_docs data;
    class github external;
```

## 처리 순서

1. 일반 사용자가 React 화면에서 문의 게시글을 작성합니다.
2. React는 JWT를 포함해 NestJS API로 게시글, 댓글, AI 검토 요청을 보냅니다.
3. NestJS는 게시판 데이터를 PostgreSQL에 저장합니다.
4. 게시글 생성·수정 직후 NestJS가 FastAPI에 게시글 RAG embedding 동기화를 요청합니다.
5. NestJS는 게시글을 AI 문의로 변환하고 FastAPI Agent 분석을 백그라운드로 준비합니다.
6. FastAPI는 문의, AI 분석 결과, Agent/MCP/API 실행 로그를 같은 PostgreSQL에 저장합니다.
7. Markdown 문서와 게시글 데이터는 LangChain RAG의 검색 지식으로 적재됩니다.
8. RAG는 OpenAI embedding과 pgvector를 사용해 유사 문서를 검색합니다.
9. LangGraph Agent는 RAG 근거와 문의 본문을 기반으로 답변 초안과 처리 방향을 생성합니다.
10. GitHub 조회가 필요하다고 판단되면 MCP GitHub 도구로 유사 이슈를 검색합니다.
11. 분석 결과는 `ai_analysis_results`에 저장되고 React 관리자 화면에서 조회됩니다.
12. 관리자는 답변 초안을 댓글 입력창에 채워 수정한 뒤 등록할 수 있습니다.
13. 개발 작업이 필요하면 관리자가 승인 버튼을 눌러 GitHub Issue 생성을 실행합니다.
14. MCP 실행 결과와 실패 여부는 `mcp_execution_logs`에 남습니다.
15. 관리자 AI 화면은 RAG 상태, Agent 단계 로그, API/MCP/LLM 지표를 보여줍니다.

## 구성요소 요약

| 영역 | 경로 | 역할 |
|---|---|---|
| Frontend | `client/basic-client` | 게시판, 로그인, 관리자 AI 검토 UI |
| Backend API | `server/basic-server` | JWT 인증, 권한, 게시글·댓글·태그, AI 서버 프록시 |
| AI Server | `ai-server/ai-inquiry-rag-server` | RAG, Agent 분석, MCP GitHub 연동, 관찰 로그 |
| Database | `infra/postgres-pgvector` | PostgreSQL + pgvector Docker Compose와 초기 스키마 |
| Knowledge Base | `ai-server/ai-inquiry-rag-server/docs` | FAQ, 장애 대응, 운영 문서 RAG 소스 |
