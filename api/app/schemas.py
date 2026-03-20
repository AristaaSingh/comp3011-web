from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class UserRegister(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=255)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "arista@example.com",
                "password": "securePass123",
            }
        }
    )


class UserLogin(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=255)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "arista@example.com",
                "password": "securePass123",
            }
        }
    )


class UserResponse(BaseModel):
    id: int
    display_name: Optional[str] = None
    email: str

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "display_name": "Arista",
                "email": "arista@example.com",
            }
        }
    )


class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, min_length=3, max_length=255)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "display_name": "Arista Singh",
                "email": "arista@example.com",
            }
        }
    )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "id": 1,
                    "display_name": "Arista",
                    "email": "arista@example.com",
                },
            }
        }
    )


class RecipeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    minutes: int = Field(..., gt=0)
    ingredients: List[str]
    steps: List[str]
    tags: Optional[List[str]] = []
    calories: Optional[float] = None
    protein: Optional[float] = None
    fat: Optional[float] = None
    carbs: Optional[float] = None
    n_ingredients: Optional[int] = None

class RecipeCreate(RecipeBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Chicken and Rice Bowl",
                "description": "A simple high-protein lunch recipe.",
                "minutes": 25,
                "ingredients": [
                    "150 g chicken breast",
                    "200 g cooked rice",
                    "50 g broccoli",
                ],
                "steps": [
                    "Season and cook the chicken.",
                    "Steam the broccoli.",
                    "Serve everything together in a bowl.",
                ],
                "tags": ["high-protein", "quick", "meal-prep"],
            }
        }
    )

class RecipeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    minutes: Optional[int] = Field(None, gt=0)
    ingredients: Optional[List[str]] = None
    steps: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    fat: Optional[float] = None
    carbs: Optional[float] = None
    n_ingredients: Optional[int] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "minutes": 30,
                "tags": ["high-protein", "weeknight"],
            }
        }
    )

class RecipeResponse(RecipeBase):
    id: int
    owner_id: Optional[int] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 12,
                "owner_id": 1,
                "name": "Chicken and Rice Bowl",
                "description": "A simple high-protein lunch recipe.",
                "minutes": 25,
                "ingredients": [
                    "150 g chicken breast",
                    "200 g cooked rice",
                    "50 g broccoli",
                ],
                "steps": [
                    "Season and cook the chicken.",
                    "Steam the broccoli.",
                    "Serve everything together in a bowl.",
                ],
                "tags": ["high-protein", "quick", "meal-prep"],
                "calories": 562.4,
                "protein": 41.8,
                "fat": 8.3,
                "carbs": 74.1,
                "n_ingredients": 3,
            }
        }
    )

class NutritionSearchResult(BaseModel):
    fdc_id: int
    description: str
    data_type: Optional[str] = None
    food_category: Optional[str] = None
    brand_owner: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "fdc_id": 171077,
                "description": "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
                "data_type": "SR Legacy",
                "food_category": "Poultry Products",
                "brand_owner": None,
            }
        }
    )

class IngredientEstimateItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    grams: float = Field(..., gt=0)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "chicken breast",
                "grams": 150,
            }
        }
    )

class IngredientEstimateRequest(BaseModel):
    ingredients: List[IngredientEstimateItem]

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "ingredients": [
                    {"name": "chicken breast", "grams": 150},
                    {"name": "cooked rice", "grams": 200},
                ]
            }
        }
    )

class IngredientNutrition(BaseModel):
    ingredient: str
    grams: Optional[float] = None
    matched_food: Optional[str] = None
    fdc_id: Optional[int] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    fat: Optional[float] = None
    carbs: Optional[float] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "ingredient": "chicken breast",
                "grams": 150,
                "matched_food": "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
                "fdc_id": 171077,
                "calories": 247.5,
                "protein": 46.6,
                "fat": 5.4,
                "carbs": 0.0,
            }
        }
    )

class NutritionEstimateResponse(BaseModel):
    ingredients: List[IngredientNutrition]
    totals: dict

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "ingredients": [
                    {
                        "ingredient": "chicken breast",
                        "grams": 150,
                        "matched_food": "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
                        "fdc_id": 171077,
                        "calories": 247.5,
                        "protein": 46.6,
                        "fat": 5.4,
                        "carbs": 0.0,
                    },
                    {
                        "ingredient": "cooked rice",
                        "grams": 200,
                        "matched_food": "Rice, white, cooked",
                        "fdc_id": 168878,
                        "calories": 260.0,
                        "protein": 5.4,
                        "fat": 0.6,
                        "carbs": 57.8,
                    },
                ],
                "totals": {
                    "calories": 507.5,
                    "protein": 52.0,
                    "fat": 6.0,
                    "carbs": 57.8,
                },
            }
        }
    )
