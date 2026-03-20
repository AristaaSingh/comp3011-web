# Authentication

[Overview](./index.md) | [Architecture](./architecture.md) | [API](./api.md) | [Authentication](./auth.md) | [Frontend](./frontend.md) | [Deployment](./deployment.md)

This page explains how authentication is implemented in the project and how it is enforced by the API.

## Overview

Authentication is implemented as an API service, not as frontend-only logic.

- users register and log in through backend endpoints
- passwords are hashed server-side before storage
- successful authentication returns a JWT access token
- protected endpoints require `Authorization: Bearer <token>`
- the backend validates the token and resolves the current user before allowing protected actions

This means the authentication flow still works without the frontend. The frontend is only one client of the API. The same login, profile, and protected recipe operations can be used through Swagger UI, ReDoc, Postman, or any other client.

## How it works

### 1. Registration

`POST /auth/register`

- accepts an email and password
- checks whether the email is already in use
- hashes the password before saving the user
- stores the new user in the database
- returns a JWT access token and the created user object

### 2. Login

`POST /auth/login`

- accepts an email and password
- looks up the user by email
- verifies the submitted password against the stored password hash
- returns a JWT access token and user object on success
- returns an authentication error on failure

### 3. Authenticated requests

After login or registration, the client sends:

```http
Authorization: Bearer <token>
```

on protected routes.

The backend then:

- decodes the JWT
- validates that the token is well-formed and signed correctly
- reads the user identity from the token payload
- loads the corresponding user from the database
- exposes that user as the current authenticated user

## Password storage

Passwords are not stored in plain text.

- the database stores a `password_hash`
- hashing and verification happen in the backend
- the frontend never performs password verification itself

This is important because it keeps credential handling inside the API, where it can be reused consistently by any client.

## User profile endpoints

Authentication is separated from profile management.

Auth endpoints:

- `POST /auth/register`
- `POST /auth/login`

User profile endpoints:

- `GET /users/me`
- `PATCH /users/me`
- `PATCH /users/me/password`
- `DELETE /users/me`

This separation keeps responsibilities clearer:

- `/auth` handles identity and token issuance
- `/users` handles account data, profile editing, password changes, and account deletion

Email remains viewable but non-editable in the account-management flow. Profile editing is limited to user-facing fields such as `display_name`, while password changes and account deletion each require their own dedicated secured endpoint.

## Recipe ownership and permissions

Authentication is used together with recipe ownership.

- all users can view and search recipes
- authenticated users can create recipes
- recipes store the creating user's id in `owner_id`
- only the owner can update or delete that recipe
- deleting a user account also deletes that user's owned recipes
- seeded recipes have no owner, so they remain public to view but are not editable by users

This permission logic is enforced in the backend, not only hidden in the frontend interface.

## Frontend behavior

The frontend changes based on authentication state, but it is only reflecting backend state rather than replacing backend security.

- when signed out, the account page shows sign-in and register forms
- when signed in, the account page shows account editing and logout
- the frontend stores the JWT token locally and sends it on protected requests
- changing password requires the current password plus a new password
- deleting an account requires the user's password as confirmation
- edit and delete controls are only shown for recipes owned by the current user

Even so, the backend remains the source of truth. If a client tries to update or delete a recipe it does not own, the API still rejects the request.

## Why this matters

This project is intended to provide API functionality, not just browser-only features. Authentication supports that goal because:

- account creation is API-driven
- login is API-driven
- profile access is API-driven
- profile editing is API-driven
- recipe permissions are API-enforced

So the frontend is a consumer of the authentication service, not the place where authentication is actually implemented.
