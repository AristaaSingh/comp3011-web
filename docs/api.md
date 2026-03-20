# API

[Overview](./index.md) | [Architecture](./architecture.md) | [API](./api.md) | [Authentication](./auth.md) | [Frontend](./frontend.md) | [Deployment](./deployment.md)

This page explains what each endpoint group does and how the backend handles each request.

These Markdown notes are intended to explain the code structure and design decisions in a readable way. They are not meant to replace the generated API reference.

## Live API documentation

The full interactive API documentation is available from FastAPI itself:

- Live Swagger UI: [https://comp3011-api-production.up.railway.app/docs](https://comp3011-api-production.up.railway.app/docs)
- Live ReDoc: [https://comp3011-api-production.up.railway.app/redoc](https://comp3011-api-production.up.railway.app/redoc)
- Local Swagger UI: `http://127.0.0.1:8000/docs`
- Local ReDoc: `http://127.0.0.1:8000/redoc`

>See a downloaded PDF of ReDoc [here](assets/Recipe-Nutrition-API-ReDoc.pdf).

These generated pages show:

- request body schemas
- response schemas
- example payloads
- authentication requirements
- query parameter details

So this Markdown page is mainly for explaining how the API is organised and how the code works, while Swagger UI and ReDoc provide the formal endpoint reference with live examples and response shapes.

Authentication design is documented separately on the [Authentication](./auth.md) page. This API page focuses on the endpoint surface and how each route behaves.

## Auth

### `POST /auth/register`

Creates a new user account.

Authentication required: **No**

Why:
- this endpoint must be public so a new user can create an account before they have a token

How it works:
- accepts an email and password
- checks whether the email is already in use
- hashes the password before storing it
- creates the user record in the database
- returns a JWT access token plus the user object

Example request body:

```json
{
  "email": "arista@example.com",
  "password": "securePass123"
}
```

### `POST /auth/login`

Authenticates an existing user.

Authentication required: **No**

Why:
- this endpoint must be public so an existing user can obtain a JWT token

How it works:
- accepts an email and password
- looks up the user by email
- verifies the submitted password against the stored password hash
- if valid, returns a JWT access token plus the user object
- if invalid, returns an authentication error

Example request body:

```json
{
  "email": "arista@example.com",
  "password": "securePass123"
}
```

The token returned by these endpoints is then sent in the `Authorization: Bearer <token>` header for protected requests. See [Authentication](./auth.md) for the full JWT and password-handling flow.

## Users

### `GET /users/me`

Returns the currently authenticated user's profile.

Authentication required: **Yes**

Why:
- this endpoint returns private account data for the signed-in user
- the backend must know which user is making the request

How it works:
- reads the JWT from the request headers
- decodes and validates the token
- loads the matching user from the database
- returns the current profile fields such as `id`, `display_name`, and `email`

### `PATCH /users/me`

Updates the currently authenticated user's profile.

Authentication required: **Yes**

Why:
- profile updates should only be allowed by the user who owns that account

How it works:
- requires a valid JWT
- accepts editable profile data such as `display_name`
- updates the user record in the database
- returns the updated user profile

Example request body:

```json
{
  "display_name": "Arista Singh"
}
```

Email is intentionally not editable through this endpoint because it is used as the account identity in the database.

This keeps profile management separate from login and registration.

### `PATCH /users/me/password`

Changes the currently authenticated user's password.

Authentication required: **Yes**

Why:
- password changes should only be allowed by the signed-in account owner
- the old password must be verified before a new one is accepted

How it works:
- requires a valid JWT
- accepts the current password and a new password
- verifies the current password against the stored password hash
- stores a new password hash if the current password is correct
- returns `204 No Content` on success

Example request body:

```json
{
  "current_password": "securePass123",
  "new_password": "newSecurePass456"
}
```

### `DELETE /users/me`

Deletes the currently authenticated user account.

Authentication required: **Yes**

Why:
- account deletion is a destructive action and must only be performed by the signed-in user

How it works:
- requires a valid JWT
- requires the user's password in the request body as confirmation
- deletes the current user from the database
- also deletes any recipes owned by that user
- returns `204 No Content` on success

Example request body:

```json
{
  "password": "securePass123"
}
```

This keeps account deletion API-driven rather than relying on frontend-only state clearing.

## Recipes

### `GET /recipes`

Returns all recipes in the database.

Authentication required: **No**

Why:
- recipe browsing is intended to be public
- users should be able to view shared recipes without signing in

How it works:
- queries the recipes table
- converts stored JSON text fields like ingredients, steps, and tags back into API response arrays
- returns the full recipe list

### `GET /recipes/mine`

Returns only the recipes created by the currently authenticated user.

Authentication required: **Yes**

Why:
- this route is user-specific and depends on recipe ownership
- it allows clients to request a current-user collection directly from the API instead of downloading all recipes and filtering in the browser

How it works:
- requires a valid JWT
- resolves the current user from the token
- filters the recipes table by `owner_id`
- returns only recipes created by that signed-in user

This endpoint powers the frontend `My Recipes` page, but it is still a general API service and can be used by Swagger UI, Postman, or any other client.

### `GET /recipes/search`

Returns recipes filtered by optional search terms.

Authentication required: **No**

Why:
- searching and filtering recipes is part of the public viewing experience

How it works:
- accepts optional `query`, `tag`, and `max_minutes` parameters
- applies those filters in the backend query
- returns the matching recipes as JSON

This means recipe filtering is handled by the API, not just by frontend-only JavaScript.

### `GET /recipes/{id}`

Returns one recipe by id.

Authentication required: **No**

Why:
- individual recipe details are viewable by all users

How it works:
- looks up the recipe in the database by primary key
- returns the recipe if found
- returns `404` if the recipe does not exist

### `POST /recipes`

Creates a new recipe.

Authentication required: **Yes**

Why:
- the backend needs to record which user created the recipe
- recipe ownership is used later to control edit and delete permissions

How it works:
- requires a valid JWT
- accepts recipe content such as name, ingredients, steps, and tags
- stores the signed-in user's id as `owner_id`
- calculates nutrition totals server-side from the gram-based ingredients using USDA-backed API logic
- saves the recipe in the database
- returns the created recipe

Example request body:

```json
{
  "name": "Chicken and Rice Bowl",
  "description": "A simple high-protein lunch recipe.",
  "minutes": 25,
  "ingredients": [
    "150 g chicken breast",
    "200 g cooked rice",
    "50 g broccoli"
  ],
  "steps": [
    "Season and cook the chicken.",
    "Steam the broccoli.",
    "Serve everything together in a bowl."
  ],
  "tags": ["high-protein", "quick", "meal-prep"]
}
```

### `PUT /recipes/{id}`

Updates an existing recipe.

Authentication required: **Yes**

Why:
- updating a recipe changes stored data
- the backend must verify that the current user is the owner of that recipe

How it works:
- requires a valid JWT
- loads the recipe by id
- checks whether the signed-in user owns that recipe
- only allows the update if `owner_id` matches the current user id
- returns `403` if the user is not the owner

Example request body:

```json
{
  "minutes": 30,
  "tags": ["high-protein", "weeknight"]
}
```

### `DELETE /recipes/{id}`

Deletes an existing recipe.

Authentication required: **Yes**

Why:
- deleting a recipe is a destructive operation
- the backend must verify that the current user owns the recipe before allowing deletion

How it works:
- requires a valid JWT
- loads the recipe by id
- checks recipe ownership
- only deletes the recipe if the current user is the owner
- returns `403` if the user is not allowed to delete it

All users can view recipes, but only the owner can update or delete the recipes they created. Seeded sample recipes are public to view and have no owner.

## Ingredients

### `GET /ingredients/search`

Searches USDA foods for ingredient suggestions.

Authentication required: **No**

Why:
- ingredient lookup supports recipe creation and general ingredient exploration
- it is safe to expose as a public read-only service

How it works:
- accepts a `query` string
- sends that search term from your API to the USDA FoodData Central API
- transforms the USDA result into your own API response format
- returns fields like description, data type, food category, brand owner, and FDC id

Example request:

```text
GET /ingredients/search?query=chicken%20breast
```

This endpoint is a service provided by the backend. The frontend autocomplete is only a client for it.

## Nutrition

### `GET /nutrition/search`

Searches USDA foods specifically for the nutrition tools page.

Authentication required: **No**

Why:
- this is a read-only search endpoint for public nutrition tooling

How it works:
- accepts a search term
- calls USDA through your backend
- returns a simplified list of matching foods for display in the nutrition page

Example request:

```text
GET /nutrition/search?query=rice
```

### `POST /nutrition/estimate`

Estimates nutrition totals for a list of ingredients using gram amounts.

Authentication required: **No**

Why:
- nutrition estimation is a calculation service and does not modify stored data
- it can be used independently of user accounts

How it works:
- accepts structured ingredient data with `name` and `grams`
- searches USDA for the best food match for each ingredient name
- fetches USDA food details for that match
- extracts key nutrients such as calories, protein, fat, and carbohydrates
- determines a reference gram amount from the USDA response when available
- scales the nutrient values to the submitted grams
- returns both per-ingredient results and overall totals

```json
{
  "ingredients": [
    { "name": "chicken breast", "grams": 150 },
    { "name": "rice", "grams": 200 }
  ]
}
```
