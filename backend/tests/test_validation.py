import pytest

from tests.conftest import AUTH, FEEDS, payload


@pytest.mark.parametrize("feed", ["deals", "airdrops"])
@pytest.mark.parametrize(
    "description",
    [
        "FREE developer software",
        "No-cost cloud credits",
        "Zero-cost learning",
        "Costs $0",
        "Costs $0.00",
    ],
)
def test_free_markers(client, feed, description):
    response = client.post(
        f"/api/{feed}", json=payload(feed, description=description), headers=AUTH
    )
    assert response.status_code == 201, response.text


@pytest.mark.parametrize("feed", ["deals", "airdrops"])
@pytest.mark.parametrize(
    "changes",
    [
        {"description": "A paid tool"},
        {"description": "Freedom to build"},
        {"description": "Costs $0.50"},
        {"description": "Costs $01"},
        {"tag": "Crypto"},
        {"tag": "ai"},
        {"claim_steps": "Visit"},
        {"claim_steps": [""]},
        {"claim_steps": ["  "]},
        {"claim_steps": [123]},
        {"claim_steps": [None]},
        {"claim_steps": {"step": "Visit"}},
        {"expires": "2026-1-02"},
        {"expires": "2026-02-30"},
        {"expires": "2026-10-15T00:00:00Z"},
        {"expires": 1792022400},
    ],
)
def test_offer_validation(client, feed, changes):
    assert (
        client.post(f"/api/{feed}", json=payload(feed, **changes), headers=AUTH).status_code == 422
    )


@pytest.mark.parametrize("feed", ["deals", "airdrops"])
@pytest.mark.parametrize(
    "term",
    [
        "recharge",
        "phone plan",
        "smartphone",
        "SIM",
        "eSIM",
        "TELCO",
        "cellular",
        "prepaid",
        "postpaid",
        "data pack",
        "mobile offer",
        "handset",
        "talktime",
    ],
)
def test_telco_terms(client, feed, term):
    assert (
        client.post(
            f"/api/{feed}", json=payload(feed, description=f"Free {term}"), headers=AUTH
        ).status_code
        == 422
    )


@pytest.mark.parametrize("field", ["title", "source", "offer_details", "url", "claim_steps"])
def test_telco_rejected_outside_description(client, field):
    value = (
        ["Get a SIM"]
        if field == "claim_steps"
        else "https://example.com/recharge"
        if field == "url"
        else "Free SIM"
    )
    assert (
        client.post("/api/deals", json=payload("deals", **{field: value}), headers=AUTH).status_code
        == 422
    )


@pytest.mark.parametrize("feed", ["picks", "tips"])
@pytest.mark.parametrize(
    "value",
    ["2026-1-02", "2026-02-29", "2026-10-15T00:00:00Z", 1792022400, None, True, "", " 2026-10-15"],
)
def test_dates(client, feed, value):
    assert (
        client.post(f"/api/{feed}", json=payload(feed, date=value), headers=AUTH).status_code == 422
    )


@pytest.mark.parametrize("feed", FEEDS)
@pytest.mark.parametrize(
    "changes",
    [
        {"unknown": "field"},
        {"id": 3},
        {"created_at": "2026-10-15"},
        {"title": "  "},
        {"url": "javascript:alert(1)"},
        {"url": "not-a-url"},
        {"url": "https://user:secret@example.com"},
        {"title": 3},
    ],
)
def test_common_validation(client, feed, changes):
    assert (
        client.post(f"/api/{feed}", json=payload(feed, **changes), headers=AUTH).status_code == 422
    )


def test_similar_technical_words_are_allowed(client):
    response = client.post(
        "/api/deals",
        json=payload("deals", description="Free simulation and similarity software"),
        headers=AUTH,
    )
    assert response.status_code == 201, response.text


@pytest.mark.parametrize("feed", ["deals", "airdrops"])
def test_optional_offer_text_and_empty_steps(client, feed):
    response = client.post(
        f"/api/{feed}",
        json=payload(feed, offer_details="", claim_steps=[]),
        headers=AUTH,
    )
    assert response.status_code == 201, response.text
    assert response.json()["item"]["offer_details"] == ""
    assert response.json()["item"]["claim_steps"] == []
