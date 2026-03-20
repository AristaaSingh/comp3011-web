# Testing

[Overview](./index.md) | [Architecture](./architecture.md) | [API](./api.md) | [Authentication](./auth.md) | [Frontend](./frontend.md) | [Deployment](./deployment.md) | [Testing](./testing.md)

This page explains the backend testing approach used in the project, what is covered, and how to run the tests locally.

## Testing approach

The project currently uses a backend-focused automated test suite with `pytest`.

The goal of the suite is to verify that:

- each API endpoint responds correctly
- authentication rules are enforced
- user-specific routes behave differently from public routes where expected
- recipe ownership rules are enforced by the API, not just hidden in the frontend
- USDA-backed ingredient and nutrition routes behave predictably
- common negative cases are handled correctly

These tests are API-level integration tests rather than pure unit tests. They exercise the FastAPI application through HTTP requests using `TestClient`.

## Where the tests live

The tests are located in `comp3011-web/api/tests`

Main files:

- [api/tests/conftest.py](../api/tests/conftest.py)
- [api/tests/test_auth.py](../api/tests/test_auth.py)
- [api/tests/test_users.py](../api/tests/test_users.py)
- [api/tests/test_recipes.py](../api/tests/test_recipes.py)
- [api/tests/test_ingredients.py](../api/tests/test_ingredients.py)
- [api/tests/test_nutrition.py](../api/tests/test_nutrition.py)

## Test environment design

The tests do not use the normal local development database.

Instead, the suite:

- sets `DATABASE_URL` to a dedicated temporary SQLite test database
- overrides FastAPI's database dependency
- drops and recreates the schema before each test

This means the tests are isolated from normal local usage and can be run repeatedly without damaging the main local database.

## USDA mocking

Because the project depends on USDA FoodData Central for ingredient search and nutrition estimation, the suite mocks those USDA calls.

This is important because it makes the tests:

- deterministic
- fast
- independent of internet access
- independent of USDA rate limits or live data changes

The USDA mocking is defined in:

- [api/tests/conftest.py](../api/tests/conftest.py)

## What is covered

### Authentication tests

Covered in:

- [api/tests/test_auth.py](../api/tests/test_auth.py)

These tests check:

- successful registration
- duplicate email rejection
- successful login
- invalid login rejection
- current-user lookup with and without authentication

### User account tests

Covered in:

- [api/tests/test_users.py](../api/tests/test_users.py)

These tests check:

- unauthenticated access is rejected for account routes
- current user profile can be read
- display name updates work
- email updates are ignored
- password change works
- wrong current password is rejected
- account deletion removes the user
- account deletion also removes the user's owned recipes
- wrong password blocks account deletion

### Recipe tests

Covered in:

- [api/tests/test_recipes.py](../api/tests/test_recipes.py)

These tests check:

- public recipe listing
- authenticated `My Recipes` retrieval
- recipe creation requires authentication
- created recipes store ownership
- recipe nutrition is calculated by the backend
- recipe retrieval by id
- `404` handling for missing recipes
- public recipe search and filter behaviour
- default search behaviour with no filters
- ownership enforcement on update and delete
- nutrition recalculation on update
- rejection of invalid ingredient formats
- successful deletion of owned recipes

### Ingredient tests

Covered in:

- [api/tests/test_ingredients.py](../api/tests/test_ingredients.py)

These tests check:

- successful USDA-backed ingredient search
- empty-result responses when no USDA match is found

### Nutrition tests

Covered in:

- [api/tests/test_nutrition.py](../api/tests/test_nutrition.py)

These tests check:

- USDA-backed nutrition search
- empty-result nutrition search responses
- gram-based nutrition scaling
- unmatched ingredient handling in nutrition estimates

## How to run the tests

From the repository root:

```bash
venv/bin/python -m pytest api/tests
```

For quieter output:

```bash
venv/bin/python -m pytest api/tests -q
```

If you prefer to run from inside `api/`:

```bash
cd api
../venv/bin/python -m pytest tests
```

## Current result

At the time of writing, the suite passes with:

- `41 passed`

There is still one warning from the external `passlib` dependency using Python's deprecated `crypt` module. That warning comes from the dependency stack rather than from the project route code itself.

## Why this matters for the coursework

The tests support the coursework in two ways:

- they demonstrate that the API can be run and verified independently of the frontend
- they show that the important service rules, such as authentication, ownership, and nutrition estimation, are enforced by the backend

This is important because the project is intended to be an API-driven system, with the frontend acting as a client rather than being the only place where behaviour exists.
