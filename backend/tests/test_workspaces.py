"""Automated tests for Workspace Management & Tenant Isolation."""


def get_token(client, email: str, password: str = "password123") -> str:
    """Helper to register and login a user, returning access token."""
    client.post("/api/auth/register", json={"email": email, "password": password})
    login_resp = client.post("/api/auth/login", json={"email": email, "password": password})
    return login_resp.json()["access_token"]


def test_create_workspace_requires_auth(client):
    response = client.post("/api/workspaces", json={"workspace_name": "Test Club"})
    assert response.status_code == 401


def test_user_can_create_and_list_multiple_workspaces(client):
    token = get_token(client, "raad@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Workspace A
    resp_a = client.post(
        "/api/workspaces",
        json={"workspace_name": "Arsenal Fan Page"},
        headers=headers,
    )
    assert resp_a.status_code == 201
    ws_a = resp_a.json()
    assert ws_a["workspace_name"] == "Arsenal Fan Page"

    # 2. Create Workspace B
    resp_b = client.post(
        "/api/workspaces",
        json={"workspace_name": "Barcelona Updates"},
        headers=headers,
    )
    assert resp_b.status_code == 201
    ws_b = resp_b.json()
    assert ws_b["workspace_name"] == "Barcelona Updates"

    # 3. List workspaces — must return both
    list_resp = client.get("/api/workspaces", headers=headers)
    assert list_resp.status_code == 200
    workspaces = list_resp.json()
    names = [w["workspace_name"] for w in workspaces]
    assert "Arsenal Fan Page" in names
    assert "Barcelona Updates" in names


def test_workspace_rename(client):
    token = get_token(client, "manager@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # Create workspace
    create_resp = client.post(
        "/api/workspaces",
        json={"workspace_name": "Original Name"},
        headers=headers,
    )
    ws_id = create_resp.json()["id"]

    # Rename workspace
    patch_resp = client.patch(
        f"/api/workspaces/{ws_id}",
        json={"workspace_name": "Updated Name"},
        headers=headers,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["workspace_name"] == "Updated Name"

    # Fetch to confirm persistence
    get_resp = client.get(f"/api/workspaces/{ws_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["workspace_name"] == "Updated Name"


def test_tenant_isolation_cannot_access_other_user_workspace(client):
    """Crucial security test: User B cannot access, view, or modify User A's workspace."""
    token_a = get_token(client, "user_a@clubpost.dev")
    token_b = get_token(client, "user_b@clubpost.dev")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates Workspace
    create_resp = client.post(
        "/api/workspaces",
        json={"workspace_name": "User A Private Workspace"},
        headers=headers_a,
    )
    assert create_resp.status_code == 201
    ws_id = create_resp.json()["id"]

    # User B lists workspaces — should be empty for User B
    list_b = client.get("/api/workspaces", headers=headers_b)
    assert list_b.status_code == 200
    assert len(list_b.json()) == 0

    # User B tries to GET User A's workspace -> must be 404 (Not Found, no enumeration)
    get_b = client.get(f"/api/workspaces/{ws_id}", headers=headers_b)
    assert get_b.status_code == 404
    assert get_b.json()["detail"] == "Workspace not found"

    # User B tries to PATCH User A's workspace -> must be 404
    patch_b = client.patch(
        f"/api/workspaces/{ws_id}",
        json={"workspace_name": "Hacked Name"},
        headers=headers_b,
    )
    assert patch_b.status_code == 404

    # User B tries to DELETE User A's workspace -> must be 404
    del_b = client.delete(f"/api/workspaces/{ws_id}", headers=headers_b)
    assert del_b.status_code == 404

    # Confirm User A's workspace still exists untouched
    get_a = client.get(f"/api/workspaces/{ws_id}", headers=headers_a)
    assert get_a.status_code == 200
    assert get_a.json()["workspace_name"] == "User A Private Workspace"


def test_workspace_deletion(client):
    token = get_token(client, "deleter@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/workspaces",
        json={"workspace_name": "To Be Deleted"},
        headers=headers,
    )
    ws_id = create_resp.json()["id"]

    # Delete
    del_resp = client.delete(f"/api/workspaces/{ws_id}", headers=headers)
    assert del_resp.status_code == 204

    # Verify 404 on subsequent get
    get_resp = client.get(f"/api/workspaces/{ws_id}", headers=headers)
    assert get_resp.status_code == 404

