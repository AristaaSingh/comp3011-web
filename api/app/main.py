import json
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app import schemas, crud, models, usda
from app.security import authenticate_user, create_access_token, get_current_user, hash_password

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Recipe Nutrition API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def user_to_response(user: models.User) -> schemas.UserResponse:
    return schemas.UserResponse(id=user.id, email=user.email)

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

@app.get("/recipes", response_model=list[schemas.RecipeResponse])
def read_recipes(db: Session = Depends(get_db)):
    recipes = crud.get_recipes(db)
    return [recipe_to_response(recipe) for recipe in recipes]

@app.get("/recipes/search", response_model=list[schemas.RecipeResponse])
def search_recipes(
    query: str | None = None,
    tag: str | None = None,
    max_minutes: int | None = None,
    db: Session = Depends(get_db),
):
    recipes = crud.search_recipes(db, query=query, tag=tag, max_minutes=max_minutes)
    return [recipe_to_response(recipe) for recipe in recipes]

@app.post("/auth/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    existing_user = crud.get_user_by_email(db, payload.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user = crud.create_user(db, payload.email, hash_password(payload.password))
    token = create_access_token(subject=user.email, user_id=user.id)
    return schemas.TokenResponse(access_token=token, user=user_to_response(user))


@app.post("/auth/login", response_model=schemas.TokenResponse)
def login_user(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(subject=user.email, user_id=user.id)
    return schemas.TokenResponse(access_token=token, user=user_to_response(user))


@app.get("/auth/me", response_model=schemas.UserResponse)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    return user_to_response(current_user)

@app.post("/recipes", response_model=schemas.RecipeResponse, status_code=status.HTTP_201_CREATED)
def create_recipe(
    recipe: schemas.RecipeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    created_recipe = crud.create_recipe(db, recipe)
    return recipe_to_response(created_recipe)

@app.get("/recipes/{recipe_id}", response_model=schemas.RecipeResponse)
def read_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = crud.get_recipe(db, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe_to_response(recipe)

@app.put("/recipes/{recipe_id}", response_model=schemas.RecipeResponse)
def update_recipe(
    recipe_id: int,
    recipe_update: schemas.RecipeUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    updated_recipe = crud.update_recipe(db, recipe_id, recipe_update)
    if not updated_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe_to_response(updated_recipe)

@app.delete("/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
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
