import json
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app import schemas, crud, models, usda

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

app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/frontend")
def frontend():
    return FileResponse("app/static/index.html")

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

@app.get("/nutrition/search", response_model=list[schemas.NutritionSearchResult])
async def nutrition_search(query: str):
    data = await usda.search_foods(query=query, page_size=5)

    foods = data.get("foods", [])
    results = []

    for food in foods:
        results.append(
            schemas.NutritionSearchResult(
                fdc_id=food.get("fdcId"),
                description=food.get("description", "Unknown"),
                data_type=food.get("dataType")
            )
        )

    return results


@app.post("/nutrition/estimate", response_model=schemas.NutritionEstimateResponse)
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
            ingredient_results.append(
                schemas.IngredientNutrition(ingredient=ingredient)
            )
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