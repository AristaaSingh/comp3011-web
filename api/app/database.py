import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.env import load_env_file

load_env_file()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./recipes.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("postgresql://") and "+psycopg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine_kwargs = {"pool_pre_ping": True}

if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_schema():
    inspector = inspect(engine)
    with engine.begin() as connection:
        if "users" in inspector.get_table_names():
            user_columns = {column["name"] for column in inspector.get_columns("users")}
            if "display_name" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN display_name VARCHAR"))

        if "recipes" in inspector.get_table_names():
            recipe_columns = {column["name"] for column in inspector.get_columns("recipes")}
            if "owner_id" not in recipe_columns:
                connection.execute(text("ALTER TABLE recipes ADD COLUMN owner_id INTEGER"))
