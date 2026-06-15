from fastapi import FastAPI

app = FastAPI()  # FastAPI 앱 객체 생성. Uvicorn이 이 앱을 찾아서 실행함


@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI World"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
