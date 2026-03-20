from fastapi import APIRouter, Query

from app import schemas, usda
from app.serializers import foods_to_search_results

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


@router.get("/search", response_model=list[schemas.NutritionSearchResult])
async def ingredient_search(
    query: str = Query(..., description="Ingredient search term sent to USDA", example="chicken breast")
):
    data = await usda.search_foods(query=query, page_size=5)
    foods = data.get("foods", [])
    return foods_to_search_results(foods)
