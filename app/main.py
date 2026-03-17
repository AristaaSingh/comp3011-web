import json
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app import schemas, crud, models

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Recipe Nutrition API")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
        n_ingredients=recipe.n_ingredients
    )

@app.get("/")
def root():
    return {"message": "Recipe Nutrition API is running"}

@app.post("/recipes", response_model=schemas.RecipeResponse, status_code=status.HTTP_201_CREATED)
def create_recipe(recipe: schemas.RecipeCreate, db: Session = Depends(get_db)):
    created_recipe = crud.create_recipe(db, recipe)
    return recipe_to_response(created_recipe)

@app.get("/recipes", response_model=list[schemas.RecipeResponse])
def read_recipes(db: Session = Depends(get_db)):
    recipes = crud.get_recipes(db)
    return [recipe_to_response(recipe) for recipe in recipes]

@app.get("/recipes/{recipe_id}", response_model=schemas.RecipeResponse)
def read_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = crud.get_recipe(db, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe_to_response(recipe)

@app.put("/recipes/{recipe_id}", response_model=schemas.RecipeResponse)
def update_recipe(recipe_id: int, recipe_update: schemas.RecipeUpdate, db: Session = Depends(get_db)):
    updated_recipe = crud.update_recipe(db, recipe_id, recipe_update)
    if not updated_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe_to_response(updated_recipe)

@app.delete("/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    deleted_recipe = crud.delete_recipe(db, recipe_id)
    if not deleted_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return