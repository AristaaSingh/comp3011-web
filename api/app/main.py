from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models
from app.database import Base, SessionLocal, engine, ensure_schema
from app.routers import auth, ingredients, nutrition, recipes, users
from app.seeding import seed_sample_recipes_if_empty

Base.metadata.create_all(bind=engine)
ensure_schema()

app = FastAPI(title="Recipe Nutrition API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(recipes.router)
app.include_router(ingredients.router)
app.include_router(nutrition.router)


with SessionLocal() as db:
    seed_sample_recipes_if_empty(db)
