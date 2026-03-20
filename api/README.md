# API Project

This project serves the JSON API only. It does not serve templates or static files.

## Live Site

The deployed application can be viewed live at:

- [comp3011-frontend-production.up.railway.app](https://comp3011-frontend-production.up.railway.app)

This frontend talks to the deployed API service on Railway.

The live interactive API documentation is available at:

- Swagger UI: [https://comp3011-api-production.up.railway.app/docs](https://comp3011-api-production.up.railway.app/docs)
- ReDoc: [https://comp3011-api-production.up.railway.app/redoc](https://comp3011-api-production.up.railway.app/redoc)

## Local Development

```bash
cd api
source ../venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs on `http://127.0.0.1:8000` by default.

## Local Configuration

- local database file: [recipes.db](./recipes.db)
- local environment file: [api/.env](./.env)
- local dependencies: [requirements.txt](./requirements.txt)

Important variables:

- `USDA_API_KEY`
- `DATABASE_URL` optional for local development

If `DATABASE_URL` is not set, the API uses local SQLite. If `DATABASE_URL` is set, the API connects to the deployed database instead.

## Railway Integration

The API is deployed as a separate Railway service and is consumed by the separately deployed static frontend.

Railway is used for:

- hosting the FastAPI backend
- injecting deployment environment variables
- connecting the backend to Railway PostgreSQL

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

Once deployed, the Railway API service exposes the interactive FastAPI documentation at:

- `https://comp3011-api-production.up.railway.app/docs`
- `https://comp3011-api-production.up.railway.app/redoc`

## Notes

- CORS is enabled so the separate static frontend can call the API.
- Recipe search is exposed through `GET /recipes/search`.
- PostgreSQL on Railway is accessed through SQLAlchemy with the `psycopg` driver.
