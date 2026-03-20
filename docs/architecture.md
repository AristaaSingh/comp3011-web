# Architecture

[Overview](./index.md) | [Architecture](./architecture.md) | [API](./api.md) | [Frontend](./frontend.md) | [Deployment](./deployment.md)

The application uses a split frontend/backend design.

## Backend

The FastAPI backend is responsible for:

- recipe CRUD and search
- authentication with JWT
- user profile management
- USDA-backed ingredient lookup
- USDA-backed nutrition estimation

## Frontend

The frontend is a static site that:

- renders the recipe, nutrition, and account pages
- collects user input
- calls the backend with `fetch()`
- does not replace backend business logic

## Router structure

`main.py` is intentionally small. It creates the app, configures CORS, ensures schema compatibility, and includes routers.

- `routers/auth.py`
- `routers/users.py`
- `routers/recipes.py`
- `routers/ingredients.py`
- `routers/nutrition.py`

## Database model overview

- **User**: account data, including `display_name`, `email`, and `password_hash`
- **Recipe**: recipe content, calculated nutrition, and `owner_id` for edit/delete permissions
