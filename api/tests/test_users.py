import pytest


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("get", "/users/me", None),
        ("patch", "/users/me", {"display_name": "Arista"}),
        ("patch", "/users/me/password", {"current_password": "securePass123", "new_password": "newSecurePass456"}),
        ("delete", "/users/me", {"password": "securePass123"}),
    ],
)
def test_user_account_routes_require_authentication(client, method, path, payload):
    request_kwargs = {}
    if payload is not None:
        request_kwargs["json"] = payload

    response = client.request(method.upper(), path, **request_kwargs)

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required"


def test_get_users_me_returns_profile(client, auth_headers):
    response = client.get("/users/me", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["email"] == "user@example.com"
    assert response.json()["display_name"] is None


def test_patch_users_me_updates_profile(client, auth_headers):
    response = client.patch(
        "/users/me",
        headers=auth_headers,
        json={"display_name": "Arista Singh"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["display_name"] == "Arista Singh"
    assert data["email"] == "user@example.com"


def test_patch_users_me_ignores_email_updates(client, auth_headers):
    response = client.patch(
        "/users/me",
        headers=auth_headers,
        json={"email": "other@example.com"},
    )

    assert response.status_code == 200
    assert response.json()["email"] == "user@example.com"


def test_patch_users_me_password_updates_password(client, auth_headers):
    response = client.patch(
        "/users/me/password",
        headers=auth_headers,
        json={"current_password": "securePass123", "new_password": "newSecurePass456"},
    )

    login_response = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "newSecurePass456"},
    )

    assert response.status_code == 204
    assert login_response.status_code == 200


def test_patch_users_me_password_rejects_wrong_current_password(client, auth_headers):
    response = client.patch(
        "/users/me/password",
        headers=auth_headers,
        json={"current_password": "wrong-password", "new_password": "newSecurePass456"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Current password is incorrect"


def test_delete_users_me_removes_user_and_owned_recipes(client, auth_headers, mock_usda):
    create_response = client.post(
        "/recipes",
        headers=auth_headers,
        json={
            "name": "Owned Recipe",
            "description": "To be deleted with account",
            "minutes": 10,
            "ingredients": ["150 g chicken breast"],
            "steps": ["Cook chicken."],
            "tags": ["test"],
        },
    )
    recipe_id = create_response.json()["id"]

    delete_response = client.request(
        "DELETE",
        "/users/me",
        headers=auth_headers,
        json={"password": "securePass123"},
    )
    auth_me_response = client.get("/users/me", headers=auth_headers)
    recipe_response = client.get(f"/recipes/{recipe_id}")

    assert delete_response.status_code == 204
    assert auth_me_response.status_code == 401
    assert auth_me_response.json()["detail"] == "User not found"
    assert recipe_response.status_code == 404


def test_delete_users_me_rejects_wrong_password(client, auth_headers):
    response = client.request(
        "DELETE",
        "/users/me",
        headers=auth_headers,
        json={"password": "wrong-password"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Password is incorrect"
