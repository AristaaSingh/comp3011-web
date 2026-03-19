# comp3011-web

This repo is split into two projects:

- [api/README.md](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/api/README.md) for the FastAPI backend
- [frontend/README.md](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/frontend/README.md) for the static frontend

## Structure

- `api/` contains the backend application, database access, and Python dependencies
- `frontend/` contains the static HTML/CSS/JS site and frontend build step

## Local Run

API:

```bash
cd api
source ../venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
python3 -m http.server 3000
```

## Notes

- The only active Python dependency file is [api/requirements.txt](/Users/aristaasingh/Desktop/Uni Material/Year3/Web Services and Data/comp3011-web/api/requirements.txt).
- Local backend secrets should go in `api/.env`.
