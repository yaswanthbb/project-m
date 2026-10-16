from unittest.mock import Mock, call

import pytest
from firebase_admin import exceptions, messaging

from push import FirebaseSender

ALL_TOPICS = ["deals", "picks", "airdrops", "tips"]


@pytest.fixture
def subscription(clients, monkeypatch):
    sender = FirebaseSender.__new__(FirebaseSender)
    sender.app = object()
    sdk = Mock(return_value=messaging.TopicManagementResponse({"results": [{}]}))
    monkeypatch.setattr("push.messaging.subscribe_to_topic", sdk)
    return clients(sender), sdk, sender.app


def test_public_subscription_defaults_to_all_topics(subscription):
    client, sdk, firebase_app = subscription
    response = client.post("/api/push/subscribe", json={"token": "device-registration-token"})
    assert response.status_code == 200, response.text
    assert response.json() == {"subscribed": ALL_TOPICS}
    assert sdk.call_args_list == [
        call(["device-registration-token"], topic, app=firebase_app) for topic in ALL_TOPICS
    ]


def test_requested_topics_only_and_no_publish_auth(subscription):
    client, sdk, firebase_app = subscription
    response = client.post(
        "/api/push/subscribe",
        json={"token": "device-token", "topics": ["tips", "deals", "tips"]},
        headers={"X-Publish-Token": "incorrect-but-not-required"},
    )
    assert response.status_code == 200
    assert response.json() == {"subscribed": ["tips", "deals"]}
    assert sdk.call_args_list == [
        call(["device-token"], "tips", app=firebase_app),
        call(["device-token"], "deals", app=firebase_app),
    ]


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"token": ""},
        {"token": "   "},
        {"token": None},
        {"token": 123},
        {"token": True},
        {"token": ["token"]},
        {"token": "token", "topics": ["news"]},
        {"token": "token", "topics": ["Deals"]},
        {"token": "token", "topics": ["/topics/deals"]},
        {"token": "token", "topics": [None]},
        {"token": "token", "topics": "deals"},
        {"token": "token", "topics": None},
        {"token": "token", "extra": "forbidden"},
    ],
)
def test_invalid_requests_do_not_call_firebase(subscription, body):
    client, sdk, _ = subscription
    assert client.post("/api/push/subscribe", json=body).status_code == 422
    sdk.assert_not_called()


def test_explicit_empty_topics_is_noop(subscription):
    client, sdk, _ = subscription
    response = client.post("/api/push/subscribe", json={"token": "token", "topics": []})
    assert response.status_code == 200 and response.json() == {"subscribed": []}
    sdk.assert_not_called()


def test_missing_firebase_returns_service_unavailable(client):
    response = client.post("/api/push/subscribe", json={"token": "token"})
    assert response.status_code == 503
    assert response.json() == {"detail": "Firebase is not configured"}


@pytest.mark.parametrize("raise_error", [False, True])
def test_subscription_failure_reports_only_confirmed_topics(subscription, caplog, raise_error):
    client, sdk, firebase_app = subscription
    secret = "private-registration-token"
    success = messaging.TopicManagementResponse({"results": [{}]})
    failure = (
        RuntimeError(secret)
        if raise_error
        else messaging.TopicManagementResponse({"results": [{"error": "INVALID_ARGUMENT"}]})
    )
    sdk.side_effect = [success, failure, success]
    response = client.post(
        "/api/push/subscribe",
        json={"token": secret, "topics": ["deals", "picks", "tips"]},
    )
    assert response.status_code == 502
    assert response.json() == {
        "detail": {
            "message": "Could not subscribe to all requested topics",
            "subscribed": ["deals", "tips"],
            "failed": ["picks"],
            "errors": {"picks": "UNKNOWN_ERROR" if raise_error else "INVALID_ARGUMENT"},
        }
    }
    assert sdk.call_args_list == [
        call([secret], topic, app=firebase_app) for topic in ["deals", "picks", "tips"]
    ]
    assert secret not in response.text and secret not in caplog.text


@pytest.mark.parametrize(
    ("provider_reason", "safe_code"),
    [
        ("PERMISSION_DENIED", "PERMISSION_DENIED"),
        ("SENDER_ID_MISMATCH", "SENDER_ID_MISMATCH"),
        ("UNREGISTERED", "UNREGISTERED"),
        ("messaging/mismatched-credential", "MISMATCHED_CREDENTIAL"),
        ("provider error containing private-registration-token", "UNKNOWN_ERROR"),
    ],
)
def test_returned_provider_failures_have_safe_diagnostics(
    subscription, caplog, provider_reason, safe_code
):
    client, sdk, _ = subscription
    sdk.return_value = messaging.TopicManagementResponse({"results": [{"error": provider_reason}]})
    response = client.post(
        "/api/push/subscribe",
        json={"token": "private-registration-token", "topics": ["deals"]},
    )
    assert response.status_code == 502
    assert response.json()["detail"]["errors"] == {"deals": safe_code}
    assert f"Topic subscription failed for deals (reason={safe_code})" in caplog.text
    assert "private-registration-token" not in response.text + caplog.text


def test_raised_provider_failures_have_safe_diagnostics(subscription, caplog):
    client, sdk, _ = subscription
    sdk.side_effect = exceptions.PermissionDeniedError("private-registration-token")
    response = client.post(
        "/api/push/subscribe",
        json={"token": "private-registration-token", "topics": ["tips"]},
    )
    assert response.status_code == 502
    assert response.json()["detail"]["errors"] == {"tips": "PERMISSION_DENIED"}
    assert "reason=PERMISSION_DENIED" in caplog.text
    assert "private-registration-token" not in response.text + caplog.text
