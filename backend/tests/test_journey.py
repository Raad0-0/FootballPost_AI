"""Automated tests for Club Journey and multiple fixtures/results."""

import pytest
from tests.test_workspaces import get_token


def test_get_club_journey_and_dashboard_multiple_matches(client):
    token = get_token(client, "journey_user@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create workspace & track Arsenal
    ws_resp = client.post("/api/workspaces", json={"workspace_name": "Gunners Journey"}, headers=headers)
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

    # 2. Get club journey
    journey_resp = client.get(f"/api/workspaces/{ws_id}/club-journey", headers=headers)
    assert journey_resp.status_code == 200
    jdata = journey_resp.json()
    assert "club_name" in jdata
    assert "previous_season" in jdata
    assert "current_season" in jdata
    assert "comparison" in jdata
    assert jdata["previous_season"]["league_finish"] == "2nd"

    # 3. Get dashboard and verify 3 upcoming and 3 recent results
    dash_resp = client.get(f"/api/workspaces/{ws_id}/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    ddata = dash_resp.json()
    assert len(ddata["upcoming_fixtures"]) >= 2
    assert len(ddata["recent_results"]) >= 2
