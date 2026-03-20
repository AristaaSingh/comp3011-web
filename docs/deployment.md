# Deployment

[Overview](./index.md) | [Architecture](./architecture.md) | [API](./api.md) | [Authentication](./auth.md) | [Frontend](./frontend.md) | [Deployment](./deployment.md)

## Railway services

The project is deployed as three Railway services:

1. PostgreSQL
2. `comp3011-api`
3. `comp3011-frontend`

## Build and start commands

### API service

```text
Root Directory: api
Start Command: uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend service

```text
Root Directory: frontend
Build Command: python3 build.py
Start Command: python3 -m http.server 8000 -d dist
```

### Important variables

- API: `USDA_API_KEY`, `DATABASE_URL`
- Frontend: `FRONTEND_API_BASE`

## GitHub Pages docs

This `docs/` folder can also be published with GitHub Pages. In repository settings, Pages can be pointed at the `docs` directory on the main branch.

> This documentation site is separate from the app frontend. It is only for project documentation and does not replace the deployed application.
