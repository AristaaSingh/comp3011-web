# Frontend Project

This project is a static site.

## Local Run

```bash
cd frontend
python3 -m http.server 3000
```

Then open `http://127.0.0.1:3000`.

## Local API Target

The local default API target is defined in `frontend/assets/config.js`:

```js
window.API_BASE = "http://127.0.0.1:8000";
```

## Railway Build

For Railway, build the frontend with:

```bash
python3 build.py
```

This creates `dist/` and writes `dist/assets/config.js` using the `FRONTEND_API_BASE` environment variable.

Serve the built site with:

```bash
python3 -m http.server $PORT -d dist
```
