"""Automated tests for Match Monitoring, Event Deduplication, Cooldown, and Draft Management."""

from app.providers.base import ProviderMatchEvent
from app.providers.mock_provider import get_football_provider
from app.services.match_service import _LAST_MANUAL_FETCH
from tests.test_workspaces import get_token


def test_live_match_monitoring_and_draft_generation(client):
    token = get_token(client, "arsenal_fan@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create workspace & track Arsenal
    ws_resp = client.post("/api/workspaces", json={"workspace_name": "Arsenal Daily"}, headers=headers)
    ws_id = ws_resp.json()["id"]

    client.post(
        f"/api/workspaces/{ws_id}/tracked-team",
        json={
            "provider_name": "mock",
            "provider_team_id": "mock-arsenal",
            "team_name": "Arsenal FC",
            "league_id": "PL",
            "country": "England",
        },
        headers=headers,
    )

    # 2. Trigger live fetch
    fetch_resp = client.post(f"/api/workspaces/{ws_id}/matches/live/fetch-now", headers=headers)
    assert fetch_resp.status_code == 200
    data = fetch_resp.json()
    assert data["new_drafts_count"] >= 1

    # 3. List drafts and verify factual goal content
    drafts_resp = client.get(f"/api/workspaces/{ws_id}/drafts", headers=headers)
    assert drafts_resp.status_code == 200
    drafts = drafts_resp.json()
    assert len(drafts) >= 1

    goal_draft = [d for d in drafts if d["post_type"] == "goal"][0]
    assert "Bukayo Saka" in goal_draft["content"]
    assert "23" in goal_draft["content"]
    assert "1-0" in goal_draft["content"]
    assert goal_draft["status"] == "new"


def test_deterministic_deduplication(client):
    token = get_token(client, "dedup_user@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    ws_resp = client.post("/api/workspaces", json={"workspace_name": "Dedup Club"}, headers=headers)
    ws_id = ws_resp.json()["id"]

    client.post(
        f"/api/workspaces/{ws_id}/tracked-team",
        json={
            "provider_name": "mock",
            "provider_team_id": "mock-arsenal",
            "team_name": "Arsenal FC",
        },
        headers=headers,
    )

    # First fetch creates initial drafts
    client.post(f"/api/workspaces/{ws_id}/matches/live/fetch-now", headers=headers)
    count_1 = len(client.get(f"/api/workspaces/{ws_id}/drafts", headers=headers).json())

    # Clear cooldown in memory so we can fetch again immediately for test
    _LAST_MANUAL_FETCH.pop(ws_id, None)

    # Second fetch without new events in provider
    fetch_2 = client.post(f"/api/workspaces/{ws_id}/matches/live/fetch-now", headers=headers)
    assert fetch_2.status_code == 200
    assert fetch_2.json()["new_drafts_count"] == 0  # Deduplication verified!

    count_2 = len(client.get(f"/api/workspaces/{ws_id}/drafts", headers=headers).json())
    assert count_1 == count_2


def test_manual_fetch_cooldown_enforcement(client):
    token = get_token(client, "cooldown_user@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    ws_resp = client.post("/api/workspaces", json={"workspace_name": "Cooldown Club"}, headers=headers)
    ws_id = ws_resp.json()["id"]

    client.post(
        f"/api/workspaces/{ws_id}/tracked-team",
        json={
            "provider_name": "mock",
            "provider_team_id": "mock-arsenal",
            "team_name": "Arsenal FC",
        },
        headers=headers,
    )

    # First fetch succeeds
    r1 = client.post(f"/api/workspaces/{ws_id}/matches/live/fetch-now", headers=headers)
    assert r1.status_code == 200

    # Immediate second fetch must trigger 429
    r2 = client.post(f"/api/workspaces/{ws_id}/matches/live/fetch-now", headers=headers)
    assert r2.status_code == 429
    assert "please wait" in r2.json()["detail"].lower()


def test_dynamic_event_progression_creates_subsequent_drafts(client):
    token = get_token(client, "progression_user@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    ws_resp = client.post("/api/workspaces", json={"workspace_name": "Live Match Hub"}, headers=headers)
    ws_id = ws_resp.json()["id"]

    client.post(
        f"/api/workspaces/{ws_id}/tracked-team",
        json={
            "provider_name": "mock",
            "provider_team_id": "mock-arsenal",
            "team_name": "Arsenal FC",
        },
        headers=headers,
    )

    # Fetch 1
    client.post(f"/api/workspaces/{ws_id}/matches/live/fetch-now", headers=headers)

    # Simulate 2nd goal in mock provider: Declan Rice 58' (2-0)
    provider = get_football_provider()
    provider.set_live_match_event(
        team_id="mock-arsenal",
        new_event=ProviderMatchEvent(
            id="mock-evt-3",
            event_type="goal",
            minute=58,
            player_name="Declan Rice",
            team_name="Arsenal FC",
            event_detail="Header from corner",
        ),
        home_score=2,
        away_score=0,
        minute=58,
    )

    # Bypass cooldown for unit test
    _LAST_MANUAL_FETCH.pop(ws_id, None)

    # Fetch 2 -> should detect Rice's goal!
    r2 = client.post(f"/api/workspaces/{ws_id}/matches/live/fetch-now", headers=headers)
    assert r2.status_code == 200
    assert r2.json()["new_drafts_count"] == 1
    assert "Declan Rice" in r2.json()["new_drafts"][0]["content"]


def test_draft_status_lifecycle_and_editing(client):
    token = get_token(client, "editor@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    ws_resp = client.post("/api/workspaces", json={"workspace_name": "Edit Club"}, headers=headers)
    ws_id = ws_resp.json()["id"]

    # 1. Create a custom draft
    create_resp = client.post(
        f"/api/workspaces/{ws_id}/drafts",
        json={"post_type": "fixture", "content": "Initial fixture announcement"},
        headers=headers,
    )
    assert create_resp.status_code == 201
    draft_id = create_resp.json()["id"]
    assert create_resp.json()["status"] == "new"

    # 2. Edit text -> auto transitions to "edited"
    patch_text = client.patch(
        f"/api/drafts/{draft_id}",
        json={"content": "Updated match preview with lineup!"},
        headers=headers,
    )
    assert patch_text.status_code == 200
    assert patch_text.json()["content"] == "Updated match preview with lineup!"
    assert patch_text.json()["status"] == "edited"

    # 3. Mark as "copied"
    patch_copied = client.patch(
        f"/api/drafts/{draft_id}",
        json={"status": "copied"},
        headers=headers,
    )
    assert patch_copied.status_code == 200
    assert patch_copied.json()["status"] == "copied"

    # 4. Mark as "used"
    patch_used = client.patch(
        f"/api/drafts/{draft_id}",
        json={"status": "used"},
        headers=headers,
    )
    assert patch_used.status_code == 200
    assert patch_used.json()["status"] == "used"

    # 5. Filter drafts by status
    list_used = client.get(f"/api/workspaces/{ws_id}/drafts?status=used", headers=headers)
    assert list_used.status_code == 200
    assert len(list_used.json()) == 1

    list_new = client.get(f"/api/workspaces/{ws_id}/drafts?status=new", headers=headers)
    assert list_new.status_code == 200
    assert len(list_new.json()) == 0

    # 6. Delete draft
    del_resp = client.delete(f"/api/drafts/{draft_id}", headers=headers)
    assert del_resp.status_code == 204

    # 7. Confirm 404 after deletion
    get_after = client.get(f"/api/drafts/{draft_id}", headers=headers)
    assert get_after.status_code == 404


def test_drafts_tenant_isolation(client):
    """User B cannot view, modify, or delete User A's drafts."""
    token_a = get_token(client, "owner_draft@clubpost.dev")
    token_b = get_token(client, "intruder_draft@clubpost.dev")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    ws_resp = client.post("/api/workspaces", json={"workspace_name": "Private Drafts"}, headers=headers_a)
    ws_id = ws_resp.json()["id"]

    draft_resp = client.post(
        f"/api/workspaces/{ws_id}/drafts",
        json={"post_type": "fixture", "content": "Super secret draft content"},
        headers=headers_a,
    )
    draft_id = draft_resp.json()["id"]

    # User B tries to view draft -> 404
    assert client.get(f"/api/drafts/{draft_id}", headers=headers_b).status_code == 404

    # User B tries to edit draft -> 404
    assert client.patch(f"/api/drafts/{draft_id}", json={"content": "Hacked"}, headers=headers_b).status_code == 404

    # User B tries to delete draft -> 404
    assert client.delete(f"/api/drafts/{draft_id}", headers=headers_b).status_code == 404

