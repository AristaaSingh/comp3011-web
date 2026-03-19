# comp3011-web

This project is deployed as two separate Railway services plus a PostgreSQL database:

- `api/` = FastAPI backend
- `frontend/` = static HTML/CSS/JS frontend
- Railway PostgreSQL = deployed database

The frontend and API are intentionally separated. The browser loads the static frontend, and the frontend makes `fetch()` requests to the API.

## Project Structure

- [api/](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/api) contains the FastAPI app, database access, USDA integration, and Python dependencies
- [frontend/](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/frontend) contains the static pages, JavaScript modules, and the Railway build step
- [api/README.md](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/api/README.md) has backend-specific notes
- [frontend/README.md](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/frontend/README.md) has frontend-specific notes

## Local Development

Start the API in one terminal:

```bash
cd api
source ../venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

This serves the API locally at `http://127.0.0.1:8000`.

Start the frontend in a second terminal:

```bash
cd frontend
python3 -m http.server 3000
```

Then open `http://127.0.0.1:3000`.

For local development, the frontend uses the default API base defined in [frontend/assets/config.js](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/frontend/assets/config.js):

```js
window.API_BASE = "http://127.0.0.1:8000";
```

## Environment Variables

Local backend secrets go in `api/.env`.

Important variables:

- `USDA_API_KEY` = USDA FoodData Central API key
- `DATABASE_URL` = optional deployed database URL; if not set locally, the API falls back to SQLite
- `FRONTEND_API_BASE` = frontend build-time API base URL for Railway

## Database Behavior

Local development uses SQLite by default:

- database file: [api/recipes.db](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/api/recipes.db)

Railway deployment uses PostgreSQL:

- the API reads `DATABASE_URL`
- SQLAlchemy is configured to use the `psycopg` driver for Railway Postgres

## Railway Deployment

This repo is deployed on Railway as three services:

1. `Postgres`
2. `comp3011-api`
3. `comp3011-frontend`

Do not deploy the whole repo as one service. Railway should point each service at its own subdirectory.

### API Service

Use these Railway settings for the API service:

- Root Directory: `api`
- Start Command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Required API variables:

- `USDA_API_KEY`
- `DATABASE_URL`

`DATABASE_URL` should come from the Railway Postgres service's `DATABASE_URL` variable, not `DATABASE_PUBLIC_URL`.

### Frontend Service

Use these Railway settings for the frontend service:

- Root Directory: `frontend`
- Build Command:

```bash
python3 build.py
```

- Start Command:

```bash
python3 -m http.server 8000 -d dist
```

Required frontend variable:

- `FRONTEND_API_BASE=https://<your-api-service-domain>`

It must include `https://`. If the scheme is missing, the browser treats it like a relative path and requests go to the frontend server instead of the API.

### What The Frontend Build Does

The frontend is not served directly from the source files on Railway. During deployment, [frontend/build.py](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/frontend/build.py):

- creates `frontend/dist/`
- copies the static pages and assets into `dist/`
- writes `dist/assets/config.js`
- injects the deployed API base from `FRONTEND_API_BASE`

This is why Railway needs both a build command and a start command for the frontend.

### Why The Frontend Needs Python On Railway

The frontend is a static site, but Railway still needs Python because:

- `build.py` is a Python script
- the deployed static site is served with Python's `http.server`

These files exist to make Railway detect and use a Python runtime correctly:

- [frontend/nixpacks.toml](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/frontend/nixpacks.toml)
- [frontend/requirements.txt](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/frontend/requirements.txt)

## Deployment Flow Summary

1. Push changes to GitHub.
2. Railway redeploys the `comp3011-api` and `comp3011-frontend` services.
3. The API starts FastAPI with Uvicorn.
4. The frontend runs `python3 build.py`, then serves `dist/`.
5. The frontend sends requests to the deployed API using `FRONTEND_API_BASE`.

## Notes

- The only active backend dependency file is [api/requirements.txt](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/api/requirements.txt).
- Recipe search is done by the API through `GET /recipes/search`, not by frontend-only filtering.
- If a deployed search shows raw HTML instead of JSON results, the usual cause is an incorrect `FRONTEND_API_BASE`.
