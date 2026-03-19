# Frontend Project

This project is a static site. It contains the user interface only and talks to the API through JavaScript `fetch()` calls.

## Local Run

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

The Railway frontend build step is handled by [build.py](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/frontend/build.py).

It:

- creates `dist/`
- copies the frontend pages into `dist/`
- copies the assets into `dist/assets/`
- writes `dist/assets/config.js` using `FRONTEND_API_BASE`

After that, Railway serves the built `dist/` directory.

## Railway Runtime Detection

These files help Railway treat the frontend service as a Python-powered build/serve step:

- [nixpacks.toml](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/frontend/nixpacks.toml)
- [requirements.txt](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/frontend/requirements.txt)
