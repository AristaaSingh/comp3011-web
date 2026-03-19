from fastapi import APIRouter

from app import schemas, usda
from app.serializers import foods_to_search_results

router = APIRouter(prefix="/nutrition", tags=["nutrition"])


@router.get("/search", response_model=list[schemas.NutritionSearchResult])
async def nutrition_search(query: str):
    data = await usda.search_foods(query=query, page_size=5)
    foods = data.get("foods", [])
    return foods_to_search_results(foods)


@router.post("/estimate", response_model=schemas.NutritionEstimateResponse)
async def estimate_nutrition(payload: schemas.IngredientEstimateRequest):
    ingredient_results = []
    total_calories = 0.0
    total_protein = 0.0
    total_fat = 0.0
    total_carbs = 0.0

    for ingredient in payload.ingredients:
        search_data = await usda.search_foods(query=ingredient, page_size=1)
        foods = search_data.get("foods", [])

        if not foods:
            ingredient_results.append(schemas.IngredientNutrition(ingredient=ingredient))
            continue

        best_match = foods[0]
        fdc_id = best_match.get("fdcId")
        description = best_match.get("description", "Unknown")

        details = await usda.get_food_details(fdc_id)
        nutrients = usda.extract_key_nutrients(details)

        calories = nutrients["calories"] or 0.0
        protein = nutrients["protein"] or 0.0
        fat = nutrients["fat"] or 0.0
        carbs = nutrients["carbs"] or 0.0

        total_calories += calories
        total_protein += protein
        total_fat += fat
        total_carbs += carbs

        ingredient_results.append(
            schemas.IngredientNutrition(
                ingredient=ingredient,
                matched_food=description,
                fdc_id=fdc_id,
                calories=nutrients["calories"],
                protein=nutrients["protein"],
                fat=nutrients["fat"],
                carbs=nutrients["carbs"],
            )
        )

    return schemas.NutritionEstimateResponse(
        ingredients=ingredient_results,
        totals={
            "calories": total_calories,
            "protein": total_protein,
            "fat": total_fat,
            "carbs": total_carbs,
        },
    )
