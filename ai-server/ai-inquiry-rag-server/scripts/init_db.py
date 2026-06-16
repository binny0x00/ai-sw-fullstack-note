import sys
from pathlib import Path

from sqlalchemy import text

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_ROOT))

from app.database import SessionLocal  # noqa: E402


def main() -> None:
    schema_path = (
        PROJECT_ROOT.parents[1]
        / "infra"
        / "postgres-pgvector"
        / "init"
        / "001_schema.sql"
    )
    schema_sql = schema_path.read_text(encoding="utf-8")

    db = SessionLocal()
    try:
        for statement in schema_sql.split(";"):
            statement = statement.strip()

            if statement:
                db.execute(text(statement))

        db.commit()
    finally:
        db.close()

    print("Database schema initialized.")


if __name__ == "__main__":
    main()
