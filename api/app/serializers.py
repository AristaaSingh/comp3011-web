import json

from app import models, schemas


def user_to_response(user: models.User) -> schemas.UserResponse:
    return schemas.UserResponse(id=user.id, display_name=user.display_name, email=user.email)


def recipe_to_response(recipe: models.Recipe) -> schemas.RecipeResponse:
    return schemas.RecipeResponse(
        id=recipe.id,
        name=recipe.name,
        description=recipe.description,
        minutes=recipe.minutes,
        ingredients=json.loads(recipe.ingredients),
        steps=json.loads(recipe.steps),
        tags=json.loads(recipe.tags) if recipe.tags else [],
        calories=recipe.calories,
        protein=recipe.protein,
        fat=recipe.fat,
        carbs=recipe.carbs,
        n_ingredients=recipe.n_ingredients,
    )


def foods_to_search_results(foods: list[dict]) -> list[schemas.NutritionSearchResult]:
    return [
        schemas.NutritionSearchResult(
            fdc_id=food.get("fdcId"),
            description=food.get("description", "Unknown"),
            data_type=food.get("dataType"),
            food_category=food.get("foodCategory"),
            brand_owner=food.get("brandOwner"),
        )
        for food in foods
    ]
