import ast
import csv
from pathlib import Path

from sqlalchemy.orm import Session

from app import crud, schemas


SAMPLE_RECIPES_CSV = Path(__file__).resolve().parents[2] / "sample_recipes.csv"
DEFAULT_SEED_LIMIT = 10


def _parse_list_field(raw_value: str) -> list[str]:
    if not raw_value:
        return []

    try:
        parsed = ast.literal_eval(raw_value)
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed if str(item).strip()]
    except (ValueError, SyntaxError):
        return []

    return []


def _build_seed_recipe(row: dict) -> schemas.RecipeCreate | None:
    name = (row.get("name") or "").strip()
    minutes = int(row.get("minutes") or 0)
    ingredients = _parse_list_field(row.get("ingredients", ""))
    steps = _parse_list_field(row.get("steps", ""))
    tags = _parse_list_field(row.get("tags", ""))
    nutrition = _parse_list_field(row.get("nutrition", ""))

    if not name or minutes <= 0 or not ingredients or not steps:
        return None

    calories = None
    if nutrition:
        try:
            calories = float(nutrition[0])
        except (TypeError, ValueError):
            calories = None

    return schemas.RecipeCreate(
        name=name,
        description=(row.get("description") or "").strip() or None,
        minutes=minutes,
        ingredients=ingredients,
        steps=steps,
        tags=tags,
        calories=calories,
        protein=None,
        fat=None,
        carbs=None,
        n_ingredients=len(ingredients),
    )


def seed_sample_recipes_if_empty(db: Session, limit: int = DEFAULT_SEED_LIMIT):
    if crud.count_recipes(db) > 0 or not SAMPLE_RECIPES_CSV.exists():
        return

    with SAMPLE_RECIPES_CSV.open(newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        seeded = 0

        for row in reader:
            recipe = _build_seed_recipe(row)
            if recipe is None:
                continue

            crud.create_recipe(db, recipe, owner_id=None)
            seeded += 1

            if seeded >= limit:
                break
