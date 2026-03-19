from typing import List, Optional
from pydantic import BaseModel, Field


class UserRegister(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=255)


class UserLogin(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=255)


class UserResponse(BaseModel):
    id: int
    display_name: Optional[str] = None
    email: str

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, min_length=3, max_length=255)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


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
    pass

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

class RecipeResponse(RecipeBase):
    id: int
    owner_id: Optional[int] = None

    class Config:
        from_attributes = True

class NutritionSearchResult(BaseModel):
    fdc_id: int
    description: str
    data_type: Optional[str] = None
    food_category: Optional[str] = None
    brand_owner: Optional[str] = None

class IngredientEstimateItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    grams: float = Field(..., gt=0)

class IngredientEstimateRequest(BaseModel):
    ingredients: List[IngredientEstimateItem]

class IngredientNutrition(BaseModel):
    ingredient: str
    grams: Optional[float] = None
    matched_food: Optional[str] = None
    fdc_id: Optional[int] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    fat: Optional[float] = None
    carbs: Optional[float] = None

class NutritionEstimateResponse(BaseModel):
    ingredients: List[IngredientNutrition]
    totals: dict
