from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.dependencies import get_db
from app.security import get_current_user
from app.serializers import recipe_to_response
from app.services.recipe_nutrition import estimate_recipe_totals

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.get("", response_model=list[schemas.RecipeResponse])
def read_recipes(db: Session = Depends(get_db)):
    recipes = crud.get_recipes(db)
    return [recipe_to_response(recipe) for recipe in recipes]


@router.get("/search", response_model=list[schemas.RecipeResponse])
def search_recipes(
    query: str | None = Query(default=None, description="Search by recipe name", example="chicken"),
    tag: str | None = Query(default=None, description="Filter by one tag", example="quick"),
    max_minutes: int | None = Query(default=None, description="Return recipes at or below this cooking time", example=30),
    db: Session = Depends(get_db),
):
    recipes = crud.search_recipes(db, query=query, tag=tag, max_minutes=max_minutes)
    return [recipe_to_response(recipe) for recipe in recipes]


@router.post("", response_model=schemas.RecipeResponse, status_code=status.HTTP_201_CREATED)
async def create_recipe(
    recipe: schemas.RecipeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    totals = await estimate_recipe_totals(recipe.ingredients)
    recipe.calories = totals.get("calories")
    recipe.protein = totals.get("protein")
    recipe.fat = totals.get("fat")
    recipe.carbs = totals.get("carbs")

    created_recipe = crud.create_recipe(db, recipe, owner_id=current_user.id)
    return recipe_to_response(created_recipe)


@router.get("/{recipe_id}", response_model=schemas.RecipeResponse)
def read_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = crud.get_recipe(db, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe_to_response(recipe)


@router.put("/{recipe_id}", response_model=schemas.RecipeResponse)
async def update_recipe(
    recipe_id: int,
    recipe_update: schemas.RecipeUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    recipe = crud.get_recipe(db, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if recipe.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit recipes you created")

    final_ingredients = recipe_update.ingredients
    if final_ingredients is None:
        final_ingredients = recipe_to_response(recipe).ingredients

    totals = await estimate_recipe_totals(final_ingredients)
    recipe_update.calories = totals.get("calories")
    recipe_update.protein = totals.get("protein")
    recipe_update.fat = totals.get("fat")
    recipe_update.carbs = totals.get("carbs")

    updated_recipe = crud.update_recipe(db, recipe_id, recipe_update)
    return recipe_to_response(updated_recipe)


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    recipe = crud.get_recipe(db, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if recipe.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete recipes you created")

    deleted_recipe = crud.delete_recipe(db, recipe_id)
    return
