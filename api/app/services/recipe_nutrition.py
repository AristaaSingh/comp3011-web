import re

from fastapi import HTTPException, status

from app import schemas
from app.routers.nutrition import estimate_nutrition

GRAM_INGREDIENT_PATTERN = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*g\s+(.+?)\s*$", re.IGNORECASE)


def parse_gram_ingredient(ingredient: str) -> schemas.IngredientEstimateItem:
    match = GRAM_INGREDIENT_PATTERN.match(str(ingredient or ""))
    if not match:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                "Recipe ingredients must use the format '<grams> g <ingredient name>', "
                "for example '150 g chicken breast'"
            ),
        )

    grams = float(match.group(1))
    name = match.group(2).strip()

    return schemas.IngredientEstimateItem(name=name, grams=grams)


async def estimate_recipe_totals(ingredients: list[str]) -> dict:
    parsed_ingredients = [parse_gram_ingredient(ingredient) for ingredient in ingredients]
    estimate = await estimate_nutrition(
        schemas.IngredientEstimateRequest(ingredients=parsed_ingredients)
    )
    return estimate.totals or {}
