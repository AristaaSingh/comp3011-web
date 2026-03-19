# API Project

This project serves the JSON API only.

## Run

```bash
cd api
source ../venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs on `http://127.0.0.1:8000` by default.

## Notes

- `recipes.db` lives in this project directory.
- `USDA_API_KEY` should be set in `api/.env` for local development.
- CORS is enabled so the separate static frontend can call the API.
