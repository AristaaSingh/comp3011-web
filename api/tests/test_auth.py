def test_register_user_returns_token_and_user(client):
    response = client.post(
        "/auth/register",
        json={"email": "arista@example.com", "password": "securePass123"},
    )

    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "arista@example.com"


def test_register_duplicate_email_fails(client, registered_user):
    response = client.post(
        "/auth/register",
        json={"email": "user@example.com", "password": "securePass123"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "An account with this email already exists"


def test_login_success(client, registered_user):
    response = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "securePass123"},
    )

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "user@example.com"


def test_login_invalid_password_returns_401(client, registered_user):
    response = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "wrong"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_login_unknown_email_returns_401(client):
    response = client.post(
        "/auth/login",
        json={"email": "missing@example.com", "password": "securePass123"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_auth_me_requires_token(client):
    response = client.get("/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required"


def test_auth_me_returns_current_user(client, auth_headers):
    response = client.get("/auth/me", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["email"] == "user@example.com"
