# Basic AI Server

FastAPI를 사용한 기본 AI 서버 개발 환경입니다.

## 프로젝트 구조

```text
basic-ai-server/
├── app/
│   ├── __init__.py
│   └── main.py
├── requirements.txt
└── README.md
```

## 가상환경 생성 및 활성화

```bash
python -m venv .venv
source .venv/bin/activate
```

가상환경이 활성화되었는지 확인하려면 아래 명령을 실행합니다.

```bash
which python
```

출력 경로에 `.venv/bin/python`이 포함되어 있으면 정상입니다.

## 패키지 설치

```bash
pip install -r requirements.txt
```

## 서버 실행

```bash
uvicorn app.main:app --reload
```

## 확인 URL

- 기본 API: http://127.0.0.1:8000
- 상태 확인: http://127.0.0.1:8000/health
- API 문서: http://127.0.0.1:8000/docs

## 주요 파일

- `app/main.py`: FastAPI 앱과 기본 라우터를 정의합니다.
- `requirements.txt`: 프로젝트 실행에 필요한 Python 패키지를 관리합니다.
