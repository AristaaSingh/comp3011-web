# Frontend Project

This project is a static site. It contains the user interface only and talks to the API through JavaScript `fetch()` calls.

## Live Site

The deployed application can be viewed live at:

- [comp3011-frontend-production.up.railway.app](https://comp3011-frontend-production.up.railway.app)

The live API documentation that powers this frontend is available at:

- Swagger UI: [https://comp3011-api-production.up.railway.app/docs](https://comp3011-api-production.up.railway.app/docs)
- ReDoc: [https://comp3011-api-production.up.railway.app/redoc](https://comp3011-api-production.up.railway.app/redoc)

## Local Development

```bash
cd frontend
python3 -m http.server 3000
```

Then open `http://127.0.0.1:3000`.

## Local API Target

The local default API target is defined in [assets/config.js](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/frontend/assets/config.js):

```js
window.API_BASE = "http://127.0.0.1:8000";
```

## Railway Integration

The frontend is deployed as its own Railway service, separate from the FastAPI backend.

Railway is used for:

- building the static frontend into `dist/`
- injecting the correct deployed API base URL
- serving the built static files

## Railway Settings

Railway frontend service settings used for this project:

- Root Directory: `frontend`
- Build Command:

```bash
python3 build.py
```

- Start Command:

```bash
python3 -m http.server 8000 -d dist
```

Required Railway variable:

- `FRONTEND_API_BASE=https://<your-api-service-domain>`

It must include the full `https://` prefix.

## What The Build Step Does

The Railway frontend build step is handled by [build.py](./build.py).

It:

- creates `dist/`
- copies the frontend pages into `dist/`
- copies the assets into `dist/assets/`
- writes `dist/assets/config.js` using `FRONTEND_API_BASE`

After that, Railway serves the built `dist/` directory.

## Railway Runtime Detection

These files help Railway treat the frontend service as a Python-powered build/serve step:

- [nixpacks.toml](./nixpacks.toml)
- [requirements.txt](./requirements.txt)
