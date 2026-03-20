# Recipe Nutrition API Docs

[Overview](./index.md) | [Architecture](./architecture.md) | [API](./api.md) | [Authentication](./auth.md) | [Frontend](./frontend.md) | [Deployment](./deployment.md) | [Testing](./testing.md)

This project is split into two applications plus a database:

- `api/` is the FastAPI backend
- `frontend/` is the static HTML, CSS, and JavaScript frontend
- Railway PostgreSQL is used in deployment, while local development falls back to SQLite

> The browser never talks directly to USDA or the database. It talks to your API, and the API provides the recipe, ingredient search, nutrition estimate, authentication, and user-profile services.

## Local development

Run the backend and frontend separately during local development.

It is recommended to create and activate a Python virtual environment from the repository root first:

```bash
python3 -m venv venv
source venv/bin/activate
```

```bash
cd api
source ../venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

```bash
cd frontend
python3 -m http.server 3000
```

Then open `http://127.0.0.1:3000`.

## Documentation structure

This `docs/` folder is GitHub Pages-friendly. If GitHub Pages is pointed at the `docs/` folder on the main branch, these Markdown pages can be served directly as project documentation.

- [Architecture](./architecture.md)
- [API](./api.md)
- [Authentication](./auth.md)
- [Frontend](./frontend.md)
- [Deployment](./deployment.md)
- [Testing](./testing.md)

## Testing

The backend API is covered by a pytest suite in `api/tests/`.

For the full testing explanation, see [Testing](./testing.md).

Recommended setup:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r api/requirements.txt
```

Run it locally with:

```bash
venv/bin/python -m pytest api/tests
```

The current suite covers:

- authentication endpoints, including duplicate registration and invalid login cases
- user profile, password change, and account deletion endpoints
- public recipe listing and search
- authenticated `My Recipes` retrieval
- recipe CRUD, ownership, and not-found/error paths
- ingredient search, including empty-result responses
- nutrition search and gram-based nutrition estimation, including unmatched ingredients
