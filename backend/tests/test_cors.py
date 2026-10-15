"""A separately hosted PWA must be able to read and authenticate deletes."""


def test_public_feed_cors(client):
    response = client.get("/api/deals", headers={"Origin": "https://daily.example"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "*"
    assert "access-control-allow-credentials" not in response.headers


def test_authenticated_delete_preflight(client):
    response = client.options(
        "/api/deals/1",
        headers={
            "Origin": "https://daily.example",
            "Access-Control-Request-Method": "DELETE",
            "Access-Control-Request-Headers": "X-Publish-Token",
        },
    )
    assert response.status_code == 200
    assert "DELETE" in response.headers["access-control-allow-methods"]
    assert "x-publish-token" in response.headers["access-control-allow-headers"].lower()


def test_origin_allowlist(monkeypatch, clients):
    monkeypatch.setenv("FRONTEND_ORIGINS", "https://daily.example, https://other.example")
    client = clients()
    allowed = client.get("/api/tips", headers={"Origin": "https://daily.example"})
    assert allowed.headers["access-control-allow-origin"] == "https://daily.example"
    blocked = client.get("/api/tips", headers={"Origin": "https://unknown.example"})
    assert "access-control-allow-origin" not in blocked.headers
