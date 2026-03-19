import os
from pathlib import Path

import httpx
from fastapi import HTTPException, status

USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1"
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
_ENV_FILE_LOADED = False


def _load_env_file() -> None:
    global _ENV_FILE_LOADED

    if _ENV_FILE_LOADED:
        return

    _ENV_FILE_LOADED = True

    if not ENV_PATH.exists():
        return

    for raw_line in ENV_PATH.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")

        if key and key not in os.environ:
            os.environ[key] = value


def _get_usda_api_key() -> str | None:
    # Hosted environments should provide USDA_API_KEY directly.
    # The local .env file is only a development fallback.
    _load_env_file()
    api_key = os.getenv("USDA_API_KEY", "").strip().strip("\"'")
    return api_key or None

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

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"USDA API error: {e.response.text}"
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not connect to USDA FoodData Central API"
        )

async def get_food_details(fdc_id: int):
    api_key = _get_usda_api_key()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="USDA API key is not configured"
        )

    url = f"{USDA_BASE_URL}/food/{fdc_id}"
    headers = {"X-Api-Key": api_key}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"USDA API error: {e.response.text}"
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not connect to USDA FoodData Central API"
        )

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
