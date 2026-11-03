"""Automated tests for Team Search, Tracked Teams, and Dashboard Aggregation."""

from tests.test_workspaces import get_token


def test_search_teams_via_mock_provider(client):
    token = get_token(client, "manager1@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # Create workspace
    ws_resp = client.post("/api/workspaces", json={"workspace_name": "PL Fans"}, headers=headers)
    ws_id = ws_resp.json()["id"]

    # 1. Search all teams (empty query)
    resp_all = client.get(f"/api/workspaces/{ws_id}/teams/search", headers=headers)
    assert resp_all.status_code == 200
    teams_all = resp_all.json()
    assert len(teams_all) >= 8
    names = [t["name"] for t in teams_all]
    assert "Arsenal FC" in names
    assert "Real Madrid CF" in names
    assert "FC Barcelona" in names

    # 2. Search specific query (case-insensitive substring)
    resp_ars = client.get(f"/api/workspaces/{ws_id}/teams/search?q=arsenal", headers=headers)
    assert resp_ars.status_code == 200
    teams_ars = resp_ars.json()
    assert len(teams_ars) == 1
    assert teams_ars[0]["name"] == "Arsenal FC"

    # 3. Search league
    resp_spain = client.get(f"/api/workspaces/{ws_id}/teams/search?q=spain", headers=headers)
    assert resp_spain.status_code == 200
    spain_teams = [t["name"] for t in resp_spain.json()]
    assert "Real Madrid CF" in spain_teams
    assert "FC Barcelona" in spain_teams


def test_select_and_get_tracked_team(client):
    token = get_token(client, "manager2@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # Create workspace
    ws_resp = client.post("/api/workspaces", json={"workspace_name": "Gunners Zone"}, headers=headers)
    ws_id = ws_resp.json()["id"]

    # Get tracked team before selecting one -> 404
    get_none = client.get(f"/api/workspaces/{ws_id}/tracked-team", headers=headers)
    assert get_none.status_code == 404

    # Select Arsenal
    set_resp = client.post(
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
    assert set_resp.status_code == 200
    data = set_resp.json()
    assert data["team_name"] == "Arsenal FC"
    assert data["provider_team_id"] == "mock-arsenal"
    assert data["workspace_id"] == ws_id

    # Fetch tracked team -> 200
    get_resp = client.get(f"/api/workspaces/{ws_id}/tracked-team", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["team_name"] == "Arsenal FC"

    # Switch tracked team to Manchester City
    update_resp = client.post(
        f"/api/workspaces/{ws_id}/tracked-team",
        json={
            "provider_name": "mock",
            "provider_team_id": "mock-mancity",
            "team_name": "Manchester City",
            "league_id": "PL",
            "country": "England",
        },
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["team_name"] == "Manchester City"


def test_workspace_dashboard_aggregation(client):
    token = get_token(client, "dash_user@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # Create workspace
    ws_resp = client.post("/api/workspaces", json={"workspace_name": "Barca Page"}, headers=headers)
    ws_id = ws_resp.json()["id"]

    # 1. Dashboard without tracked team
    dash_empty = client.get(f"/api/workspaces/{ws_id}/dashboard", headers=headers)
    assert dash_empty.status_code == 200
    d_empty = dash_empty.json()
    assert d_empty["tracked_team"] is None
    assert d_empty["next_fixture"] is None
    assert d_empty["recent_result"] is None

    # 2. Select FC Barcelona
    client.post(
        f"/api/workspaces/{ws_id}/tracked-team",
        json={
            "provider_name": "mock",
            "provider_team_id": "mock-barcelona",
            "team_name": "FC Barcelona",
            "league_id": "PD",
            "country": "Spain",
        },
        headers=headers,
    )

    # 3. Dashboard with FC Barcelona
    dash_barca = client.get(f"/api/workspaces/{ws_id}/dashboard", headers=headers)
    assert dash_barca.status_code == 200
    d_barca = dash_barca.json()
    assert d_barca["tracked_team"]["team_name"] == "FC Barcelona"
    assert d_barca["next_fixture"] is not None
    assert "Real Madrid CF" in d_barca["next_fixture"]["home_team"]
    assert d_barca["recent_result"] is not None
    assert d_barca["recent_result"]["home_score"] == 4
    assert d_barca["recent_result"]["away_score"] == 1


def test_dashboard_with_live_match(client):
    token = get_token(client, "live_user@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # Create workspace for Arsenal (which has default live match in mock provider)
    ws_resp = client.post("/api/workspaces", json={"workspace_name": "Arsenal Live"}, headers=headers)
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

    dash = client.get(f"/api/workspaces/{ws_id}/dashboard", headers=headers)
    assert dash.status_code == 200
    d = dash.json()
    assert d["live_match"] is not None
    assert d["live_match"]["status"] == "live"
    assert d["live_match"]["home_score"] == 1
    assert d["live_match"]["away_score"] == 0
    assert d["live_match"]["minute"] == 38


def test_team_endpoints_tenant_isolation(client):
    """User B cannot search teams or access dashboard on User A's workspace."""
    token_a = get_token(client, "owner_a@clubpost.dev")
    token_b = get_token(client, "intruder_b@clubpost.dev")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates workspace
    ws_resp = client.post("/api/workspaces", json={"workspace_name": "Private Club"}, headers=headers_a)
    ws_id = ws_resp.json()["id"]

    # User B tries to search teams using User A's workspace -> 404
    search_b = client.get(f"/api/workspaces/{ws_id}/teams/search", headers=headers_b)
    assert search_b.status_code == 404

    # User B tries to set tracked team on User A's workspace -> 404
    set_b = client.post(
        f"/api/workspaces/{ws_id}/tracked-team",
        json={
            "provider_name": "mock",
            "provider_team_id": "mock-arsenal",
            "team_name": "Arsenal FC",
        },
        headers=headers_b,
    )
    assert set_b.status_code == 404

    # User B tries to read dashboard -> 404
    dash_b = client.get(f"/api/workspaces/{ws_id}/dashboard", headers=headers_b)
    assert dash_b.status_code == 404


def test_get_match_detail_with_lineup_and_analysis(client):
    """Test fetching match details, verifying lineups and finished game analysis."""
    token = get_token(client, "lineup_tester@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # Create workspace and select Arsenal
    ws_resp = client.post("/api/workspaces", json={"workspace_name": "Lineup Test Club"}, headers=headers)
    ws_id = ws_resp.json()["id"]

    client.post(
        f"/api/workspaces/{ws_id}/tracked-team",
        json={"provider_name": "mock", "provider_team_id": "mock-arsenal", "team_name": "Arsenal FC"},
        headers=headers,
    )

    # Fetch dashboard to sync fixtures and results
    dash_resp = client.get(f"/api/workspaces/{ws_id}/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()

    # Test upcoming fixture (should have provisional lineup)
    if dash_data.get("upcoming_fixtures"):
        fix_id = dash_data["upcoming_fixtures"][0]["id"]
        res_fix = client.get(f"/api/workspaces/{ws_id}/matches/{fix_id}", headers=headers)
        assert res_fix.status_code == 200
        data_fix = res_fix.json()
        assert "lineups" in data_fix
        assert data_fix["lineups"]["lineup_status"] in ("provisional", "confirmed")
        assert len(data_fix["lineups"]["home_starting_xi"]) == 11

    # Test finished match (should have analysis and confirmed lineup)
    if dash_data.get("recent_results"):
        past_id = dash_data["recent_results"][0]["id"]
        res_past = client.get(f"/api/workspaces/{ws_id}/matches/{past_id}", headers=headers)
        assert res_past.status_code == 200
        data_past = res_past.json()
        assert data_past["lineups"]["is_confirmed"] is True
        assert data_past["analysis"] is not None
        assert "man_of_the_match" in data_past["analysis"]
        assert "key_stats" in data_past["analysis"]

