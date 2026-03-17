import ast
import csv
import json

from app.database import SessionLocal, engine, Base
from app import models


def seed_from_csv(csv_path: str) -> None:
    db = SessionLocal()

    try:
        with open(csv_path, "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)

            for row in reader:
                try:
                    ingredients = ast.literal_eval(row["ingredients"])
                    steps = ast.literal_eval(row["steps"])
                    nutrition = ast.literal_eval(row["nutrition"])
                except (ValueError, SyntaxError) as e:
                    print(f"Skipping row due to parse error: {row.get('name', 'UNKNOWN')} -> {e}")
                    continue

                calories = nutrition[0] if len(nutrition) > 0 else None
                fat = nutrition[1] if len(nutrition) > 1 else None
                protein = nutrition[4] if len(nutrition) > 4 else None
                carbs = nutrition[6] if len(nutrition) > 6 else None

                existing = db.query(models.Recipe).filter(models.Recipe.name == row["name"]).first()
                if existing:
                    print(f"Skipping duplicate recipe: {row['name']}")
                    continue

                recipe = models.Recipe(
                    name=row["name"],
                    description=row.get("description") or None,
                    minutes=int(row["minutes"]),
                    ingredients=json.dumps(ingredients),
                    steps=json.dumps(steps),
                    calories=calories,
                    protein=protein,
                    fat=fat,
                    carbs=carbs,
                    n_ingredients=int(row["n_ingredients"]) if row.get("n_ingredients") else len(ingredients),
                )

                db.add(recipe)

            db.commit()
            print("Seeding complete.")

    finally:
        db.close()


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    seed_from_csv("sample_recipes.csv")