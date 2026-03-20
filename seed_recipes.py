import argparse
import ast
import csv
import json
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker


REPO_ROOT = Path(__file__).resolve().parent
API_DIR = REPO_ROOT / "api"
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from app import models  # noqa: E402
from app.database import Base  # noqa: E402


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    if database_url.startswith("postgresql://") and "+psycopg" not in database_url:
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    return database_url


def build_session_factory(database_url: str):
    database_url = normalize_database_url(database_url)
    engine_kwargs = {"pool_pre_ping": True}

    if database_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}

    engine = create_engine(database_url, **engine_kwargs)
    Base.metadata.create_all(bind=engine)
    ensure_schema_for_engine(engine)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


def ensure_schema_for_engine(engine) -> None:
    inspector = inspect(engine)
    with engine.begin() as connection:
        if "users" in inspector.get_table_names():
            user_columns = {column["name"] for column in inspector.get_columns("users")}
            if "display_name" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN display_name VARCHAR"))

        if "recipes" in inspector.get_table_names():
            recipe_columns = {column["name"] for column in inspector.get_columns("recipes")}
            if "owner_id" not in recipe_columns:
                connection.execute(text("ALTER TABLE recipes ADD COLUMN owner_id INTEGER"))


def parse_list_field(raw_value: str) -> list[str]:
    if not raw_value:
        return []

    try:
        parsed = ast.literal_eval(raw_value)
    except (ValueError, SyntaxError):
        return []

    if not isinstance(parsed, list):
        return []

    return [str(item).strip() for item in parsed if str(item).strip()]


def parse_nutrition_field(raw_value: str) -> tuple[float | None, float | None, float | None, float | None]:
    if not raw_value:
        return None, None, None, None

    try:
        parsed = ast.literal_eval(raw_value)
    except (ValueError, SyntaxError):
        return None, None, None, None

    if not isinstance(parsed, list):
        return None, None, None, None

    def to_float(index: int) -> float | None:
        try:
            return float(parsed[index])
        except (IndexError, TypeError, ValueError):
            return None

    calories = to_float(0)
    fat = to_float(1)
    protein = to_float(4)
    carbs = to_float(6)
    return calories, protein, fat, carbs


def seed_from_csv(csv_path: Path, database_url: str, limit: int | None = None) -> None:
    SessionLocal = build_session_factory(database_url)
    db = SessionLocal()
    added = 0
    skipped = 0

    try:
        with csv_path.open("r", encoding="utf-8", newline="") as file:
            reader = csv.DictReader(file)

            for row in reader:
                if limit is not None and added >= limit:
                    break

                name = (row.get("name") or "").strip()
                minutes_raw = (row.get("minutes") or "").strip()
                ingredients = parse_list_field(row.get("ingredients", ""))
                steps = parse_list_field(row.get("steps", ""))
                tags = parse_list_field(row.get("tags", ""))
                calories, protein, fat, carbs = parse_nutrition_field(row.get("nutrition", ""))

                if not name or not minutes_raw or not ingredients or not steps:
                    skipped += 1
                    continue

                try:
                    minutes = int(minutes_raw)
                except ValueError:
                    skipped += 1
                    continue

                existing = db.query(models.Recipe).filter(models.Recipe.name == name).first()
                if existing:
                    skipped += 1
                    continue

                recipe = models.Recipe(
                    owner_id=None,
                    name=name,
                    description=(row.get("description") or "").strip() or None,
                    minutes=minutes,
                    ingredients=json.dumps(ingredients),
                    steps=json.dumps(steps),
                    tags=json.dumps(tags),
                    calories=calories,
                    protein=protein,
                    fat=fat,
                    carbs=carbs,
                    n_ingredients=int(row["n_ingredients"]) if row.get("n_ingredients") else len(ingredients),
                )

                db.add(recipe)
                added += 1

            db.commit()
            print(f"Seed complete. Added {added} recipes, skipped {skipped}.")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Seed recipe rows from sample_recipes.csv into a database.")
    parser.add_argument(
        "--csv",
        default=str(REPO_ROOT / "sample_recipes.csv"),
        help="Path to the source CSV file.",
    )
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL", "sqlite:///./api/recipes.db"),
        help="Target database URL. Defaults to DATABASE_URL env var, then local SQLite.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="How many recipes to import. Use 0 or a negative number to import all rows.",
    )
    args = parser.parse_args()

    csv_path = Path(args.csv).resolve()
    if not csv_path.exists():
        raise SystemExit(f"CSV file not found: {csv_path}")

    limit = args.limit if args.limit and args.limit > 0 else None
    seed_from_csv(csv_path, args.database_url, limit=limit)


if __name__ == "__main__":
    main()
