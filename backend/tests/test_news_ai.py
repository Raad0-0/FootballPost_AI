"""Automated tests for RSS News and Gemini AI post generation."""

import pytest
from tests.test_workspaces import get_token


def test_get_club_news(client):
    token = get_token(client, "news_user@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create workspace & track Arsenal
    ws_resp = client.post("/api/workspaces", json={"workspace_name": "Arsenal News Hub"}, headers=headers)
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

    # 2. Fetch news
    news_resp = client.get(f"/api/workspaces/{ws_id}/news", headers=headers)
    assert news_resp.status_code == 200
    articles = news_resp.json()
    assert len(articles) >= 3

    # Check properties
    for article in articles:
        assert "headline" in article
        assert "source_url" in article
        assert "source_name" in article
        assert article["category"] in ("news", "transfer")


@pytest.mark.asyncio
def test_generate_ai_post_with_fallback_and_default_hashtags(client):
    token = get_token(client, "ai_fan@clubpost.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # Create workspace with default hashtags
    ws_resp = client.post(
        "/api/workspaces",
        json={
            "workspace_name": "Gunners Social",
            "default_hashtags": "#COYG #Arsenal",
            "default_tone": "hype",
            "default_language": "english",
        },
        headers=headers,
    )
    ws_id = ws_resp.json()["id"]

    # 1. Test Hype tone generation
    payload = {
        "context_type": "goal",
        "context_data": {
            "team": "Arsenal FC",
            "opponent": "Chelsea FC",
            "player": "Bukayo Saka",
            "minute": 23,
            "score": "1-0",
        },
        "tone": "hype",
        "language": "english",
        "include_hashtags": True,
    }

    gen_resp = client.post(f"/api/workspaces/{ws_id}/ai/generate", json=payload, headers=headers)
    assert gen_resp.status_code == 200
    data = gen_resp.json()

    assert "variations" in data
    assert "short" in data["variations"]
    assert "story" in data["variations"]
    assert "discussion" in data["variations"]

    # Verify hashtags appended
    assert "#COYG #Arsenal" in data["variations"]["short"]
    assert "#COYG #Arsenal" in data["variations"]["story"]
    assert "#COYG #Arsenal" in data["variations"]["discussion"]
    assert data["tone_used"] == "hype"

    # 2. Test Banter tone generation
    payload["tone"] = "banter"
    gen_banter = client.post(f"/api/workspaces/{ws_id}/ai/generate", json=payload, headers=headers)
    assert gen_banter.status_code == 200
    assert gen_banter.json()["tone_used"] == "banter"

    # 3. Test Professional tone generation
    payload["tone"] = "professional"
    gen_pro = client.post(f"/api/workspaces/{ws_id}/ai/generate", json=payload, headers=headers)
    assert gen_pro.status_code == 200
    assert gen_pro.json()["tone_used"] == "professional"

