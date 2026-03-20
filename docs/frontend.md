# Frontend

[Overview](./index.md) | [Architecture](./architecture.md) | [API](./api.md) | [Authentication](./auth.md) | [Frontend](./frontend.md) | [Deployment](./deployment.md)

## Pages

- `index.html`: landing and search page
- `results.html`: filtered recipe results
- `recipe-form.html`: create or edit recipe
- `recipe-detail.html`: recipe detail page
- `nutrition.html`: USDA search and nutrition estimate tools
- `auth.html`: sign in, register, and account editing

## JavaScript modules

- `assets/js/api.js`: API client
- `assets/js/main.js`: page initialization and form logic
- `assets/js/recipes.js`: recipe page behavior
- `assets/js/nutrition.js`: nutrition page rendering
- `assets/js/utils.js`: shared helpers

## Auth-aware behavior

The frontend changes its UI based on authentication state:

- signed out users see the Sign In / Register forms
- signed in users see the account editing form and logout button
- edit/delete buttons for recipes only appear when the signed-in user owns that recipe

> The frontend does not implement recipe ownership by itself. It only reflects ownership information returned by the API, and the API still enforces permissions on update/delete routes.
