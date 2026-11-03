"""Automated tests for authentication endpoints."""


def test_register_success(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "alice@clubpost.dev", "password": "password123"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "alice@clubpost.dev"
    assert "id" in data
    assert "hashed_password" not in data


def test_register_duplicate_email(client):
    client.post(
        "/api/auth/register",
        json={"email": "duplicate@clubpost.dev", "password": "password123"},
    )
    response = client.post(
        "/api/auth/register",
        json={"email": "duplicate@clubpost.dev", "password": "password123"},
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


def test_login_success(client):
    client.post(
        "/api/auth/register",
        json={"email": "bob@clubpost.dev", "password": "securepassword"},
    )
    response = client.post(
        "/api/auth/login",
        json={"email": "bob@clubpost.dev", "password": "securepassword"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password(client):
    client.post(
        "/api/auth/register",
        json={"email": "carol@clubpost.dev", "password": "correctpassword"},
    )
    response = client.post(
        "/api/auth/login",
        json={"email": "carol@clubpost.dev", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert "invalid credentials" in response.json()["detail"].lower()


def test_get_me_authenticated(client):
    client.post(
        "/api/auth/register",
        json={"email": "dave@clubpost.dev", "password": "password123"},
    )
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "dave@clubpost.dev", "password": "password123"},
    )
    token = login_resp.json()["access_token"]

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "dave@clubpost.dev"


def test_get_me_unauthorized(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401

