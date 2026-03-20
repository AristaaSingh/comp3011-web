import os

import httpx
from fastapi import HTTPException, status
from app.env import load_env_file

USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1"


def _get_usda_api_key() -> str | None:
    # Hosted environments should provide USDA_API_KEY directly.
    # The local .env file is only a development fallback.
    load_env_file()
    api_key = os.getenv("USDA_API_KEY", "").strip().strip("\"'")
    return api_key or None


async def _request_usda_json(url: str, *, params: dict | None = None, headers: dict | None = None):
    last_status_error: httpx.HTTPStatusError | None = None
    last_request_error: httpx.RequestError | None = None

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url, params=params, headers=headers)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code in {429, 500, 502, 503, 504} and attempt < 2:
                last_status_error = e
                continue
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"USDA API error: {e.response.text}"
            )
        except httpx.RequestError as e:
            if attempt < 2:
                last_request_error = e
                continue
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not connect to USDA FoodData Central API"
            )

    if last_status_error is not None:
        raise HTTPException(
            status_code=last_status_error.response.status_code,
            detail=f"USDA API error: {last_status_error.response.text}"
        )

    if last_request_error is not None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not connect to USDA FoodData Central API"
        )

async def search_foods(query: str, page_size: int = 5):
    api_key = _get_usda_api_key()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="USDA API key is not configured"
        )

    url = f"{USDA_BASE_URL}/foods/search"
    headers = {
        "X-Api-Key": api_key,
    }
    params = {
        "query": query,
        "pageSize": page_size,
    }
    return await _request_usda_json(url, params=params, headers=headers)

async def get_food_details(fdc_id: int):
    api_key = _get_usda_api_key()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="USDA API key is not configured"
        )

    url = f"{USDA_BASE_URL}/food/{fdc_id}"
    headers = {"X-Api-Key": api_key}
    return await _request_usda_json(url, headers=headers)

def extract_key_nutrients(food_details: dict):
    nutrients = {
        "calories": None,
        "protein": None,
        "fat": None,
        "carbs": None,
    }

    for item in food_details.get("foodNutrients", []):
        nutrient = item.get("nutrient", {})
        name = nutrient.get("name", "").lower()
        amount = item.get("amount")

        if amount is None:
            continue

        if "energy" in name and "kcal" in name:
            nutrients["calories"] = amount
        elif name == "protein":
            nutrients["protein"] = amount
        elif name in ("total lipid (fat)", "fat"):
            nutrients["fat"] = amount
        elif "carbohydrate" in name:
            nutrients["carbs"] = amount

    return nutrients


def get_reference_grams(food_details: dict) -> float:
    serving_size = food_details.get("servingSize")
    serving_unit = str(food_details.get("servingSizeUnit", "")).lower()

    if serving_size and serving_unit in {"g", "gm", "grams", "gram"}:
        try:
            value = float(serving_size)
            if value > 0:
                return value
        except (TypeError, ValueError):
            pass

    return 100.0
