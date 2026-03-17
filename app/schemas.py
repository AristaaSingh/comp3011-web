from typing import List, Optional
from pydantic import BaseModel, Field

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

    class Config:
        from_attributes = True