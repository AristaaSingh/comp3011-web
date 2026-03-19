# API Project

This project serves the JSON API only. It does not serve templates or static files.

## Local Run

```bash
cd api
source ../venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs on `http://127.0.0.1:8000` by default.

## Local Configuration

- local database file: [recipes.db](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/api/recipes.db)
- local environment file: [api/.env](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/api/.env)
- local dependencies: [requirements.txt](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/api/requirements.txt)

Important variables:

- `USDA_API_KEY`
- `DATABASE_URL` optional for local development

If `DATABASE_URL` is not set, the API uses local SQLite. If `DATABASE_URL` is set, the API connects to the deployed database instead.

## Railway Settings

Railway API service settings used for this project:

- Root Directory: `api`
- Start Command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Required Railway variables:

- `USDA_API_KEY`
- `DATABASE_URL`

Use the Postgres service's `DATABASE_URL`, not `DATABASE_PUBLIC_URL`.

## Notes

- CORS is enabled so the separate static frontend can call the API.
- Recipe search is exposed through `GET /recipes/search`.
- PostgreSQL on Railway is accessed through SQLAlchemy with the `psycopg` driver.
