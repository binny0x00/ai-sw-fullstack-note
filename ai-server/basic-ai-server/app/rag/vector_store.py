"""
벡터 DB에 chunk를 저장하고, 사용자 질문과 비슷한 chunk를 검색
"""

from pathlib import Path    # os 별로 경로 구분자가 다르고, 문자열 조합이 길어지면 실수하기 쉬운데 간편하게 해결해줌
from typing import Any  # 아무 타입이나 올 수 있는 Any 타입 가져옴

import chromadb # 임베딩 벡터를 저장하고 유사도 검색을 해주는 벡터 DB 라이브러리

# ChromaDB가 데이터를 디스크에 저장할 폴더 이름
# 서버를 다시 실행해도 저장한 문서 벡터를 유지하려고 PersistentClient에서 사용함
CHROMA_DB_DIR = Path("chroma_db")

# ChromaDB 안에서 문서 chunk들을 묶어 관리할 collection 이름
# SQL DB의 table 이름과 비슷하게 생각하면 됨
COLLECTION_NAME = "support_docs"

class VectorStore:
    def __init__(self) -> None:
        # PersistentClient는 메모리 임시 저장이 아니라 지정한 폴더에 데이터를 계속 보관함
        self.client = chromadb.PersistentClient(path=str(CHROMA_DB_DIR))

        # collection이 이미 있으면 가져오고, 없으면 새로 만들어서 사용함
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME
        )

    def add_documents(
        self,
        ids: list[str],
        documents: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict[str, Any]],
    ) -> None:
        # 같은 id가 이미 있으면 덮어쓰고, 없으면 새로 추가함
        self.collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )

    def search(
        self,
        query_embedding: list[float],
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        # ChromaDB는 여러 query를 한 번에 받을 수 있어서 query_embeddings는 2차원 list로 전달함
        result = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )

        # query를 하나만 보냈기 때문에 첫 번째 결과 묶음만 꺼냄
        documents = result["documents"][0]
        metadatas = result["metadatas"][0]
        distances = result["distances"][0]

        search_results = []

        for document, metadata, distance in zip(documents, metadatas, distances):
            # distance는 작을수록 비슷하므로, 화면에서 쓰기 쉬운 점수 형태로 변환함
            search_results.append(
                {
                    "content": document,
                    "metadata": metadata,
                    "distance": distance,
                    "score": 1 / (1 + distance),
                }
            )

        return search_results
