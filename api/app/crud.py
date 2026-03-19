import json
from sqlalchemy.orm import Session
from app import models, schemas


def create_user(db: Session, email: str, password_hash: str):
    db_user = models.User(email=email.lower().strip(), password_hash=password_hash)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    normalized_email = email.lower().strip()
    return db.query(models.User).filter(models.User.email == normalized_email).first()


def update_user(db: Session, user: models.User, user_update: schemas.UserUpdate):
    update_data = user_update.model_dump(exclude_unset=True)

    if "email" in update_data and update_data["email"] is not None:
        update_data["email"] = update_data["email"].lower().strip()

    if "display_name" in update_data and update_data["display_name"] is not None:
        update_data["display_name"] = update_data["display_name"].strip() or None

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


def create_recipe(db: Session, recipe: schemas.RecipeCreate):
    db_recipe = models.Recipe(
        name=recipe.name,
        description=recipe.description,
        minutes=recipe.minutes,
        ingredients=json.dumps(recipe.ingredients),
        steps=json.dumps(recipe.steps),
        tags=json.dumps(recipe.tags or []),
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

def search_recipes(
    db: Session,
    query: str | None = None,
    tag: str | None = None,
    max_minutes: int | None = None,
):
    recipe_query = db.query(models.Recipe)

    if query:
        recipe_query = recipe_query.filter(models.Recipe.name.ilike(f"%{query}%"))

    if tag:
        recipe_query = recipe_query.filter(models.Recipe.tags.ilike(f"%{tag}%"))

    if max_minutes is not None:
        recipe_query = recipe_query.filter(models.Recipe.minutes <= max_minutes)

    return recipe_query.all()

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

    if "tags" in update_data:
        update_data["tags"] = json.dumps(update_data["tags"])

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
