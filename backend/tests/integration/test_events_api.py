from __future__ import annotations

import pytest


def test_i_ev_01_post_valid_password_reset(client, valid_password_reset_event):
    resp = client.post("/api/events", json=valid_password_reset_event)
    assert resp.status_code == 202
    body = resp.json()
    assert body["event_id"] == valid_password_reset_event["event_id"]
    assert body["status"] in ("success", "skipped", "error")
    assert "outcome" in body


def test_i_ev_02_duplicate_event_returns_409(client, valid_password_reset_event):
    client.post("/api/events", json=valid_password_reset_event)
    resp = client.post("/api/events", json=valid_password_reset_event)
    assert resp.status_code == 409


def test_i_ev_03_unknown_event_type_returns_422(client, valid_password_reset_event):
    event = dict(valid_password_reset_event, event_type="UNKNOWN_TYPE")
    resp = client.post("/api/events", json=event)
    assert resp.status_code == 422


def test_i_ev_04_missing_event_id_returns_422(client, valid_password_reset_event):
    event = {k: v for k, v in valid_password_reset_event.items() if k != "event_id"}
    resp = client.post("/api/events", json=event)
    assert resp.status_code == 422


def test_i_ev_05_malformed_json_returns_422(client):
    resp = client.post("/api/events", content=b"not json", headers={"Content-Type": "application/json"})
    assert resp.status_code == 422


def test_i_ev_06_post_valid_cart_event(client, valid_cart_event):
    resp = client.post("/api/events", json=valid_cart_event)
    assert resp.status_code == 202
    assert resp.json()["status"] in ("success", "skipped", "error")


def test_i_ev_07_executions_endpoint_grows(client, valid_password_reset_event):
    before = len(client.get("/api/executions").json())
    client.post("/api/events", json=valid_password_reset_event)
    after = len(client.get("/api/executions").json())
    assert after == before + 1


def test_i_ev_08_health(client):
    assert client.get("/api/health").status_code == 200


def test_i_ev_09_status_endpoint_after_post(client, valid_password_reset_event):
    client.post("/api/events", json=valid_password_reset_event)
    event_id = valid_password_reset_event["event_id"]
    resp = client.get(f"/api/events/{event_id}/status")
    assert resp.status_code == 200


def test_i_ev_10_status_endpoint_not_found(client):
    resp = client.get("/api/events/00000000-0000-0000-0000-000000000000/status")
    assert resp.status_code == 404
