import json
from sqlalchemy.orm import Session
from app import models, schemas

def create_recipe(db: Session, recipe: schemas.RecipeCreate):
    db_recipe = models.Recipe(
        name=recipe.name,
        description=recipe.description,
        minutes=recipe.minutes,
        ingredients=json.dumps(recipe.ingredients),
        steps=json.dumps(recipe.steps),
        calories=recipe.calories,
        protein=recipe.protein,
        fat=recipe.fat,
        carbs=recipe.carbs,
        n_ingredients=recipe.n_ingredients or len(recipe.ingredients)
    )
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)
    return db_recipe

def get_recipes(db: Session):
    return db.query(models.Recipe).all()

def get_recipe(db: Session, recipe_id: int):
    return db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()

def update_recipe(db: Session, recipe_id: int, recipe_update: schemas.RecipeUpdate):
    db_recipe = get_recipe(db, recipe_id)
    if not db_recipe:
        return None

    update_data = recipe_update.model_dump(exclude_unset=True)

    if "ingredients" in update_data:
        update_data["ingredients"] = json.dumps(update_data["ingredients"])
        update_data["n_ingredients"] = len(recipe_update.ingredients)

    if "steps" in update_data:
        update_data["steps"] = json.dumps(update_data["steps"])

    for key, value in update_data.items():
        setattr(db_recipe, key, value)

    db.commit()
    db.refresh(db_recipe)
    return db_recipe

def delete_recipe(db: Session, recipe_id: int):
    db_recipe = get_recipe(db, recipe_id)
    if not db_recipe:
        return None

    db.delete(db_recipe)
    db.commit()
    return db_recipe