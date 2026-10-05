"""API smoke test — runs in-process, no server needed.

    python3 backend/smoke_test.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient  # noqa: E402

from server import app  # noqa: E402

client = TestClient(app)
failures: list[str] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    suffix = f" — {detail}" if detail else ""
    print(f"{'PASS' if condition else 'FAIL'}  {name}{suffix}")
    if not condition:
        failures.append(name)


# --- health -----------------------------------------------------------------
response = client.get("/health")
data = response.json()
check(
    "GET /health",
    response.status_code == 200 and data.get("status") == "ok",
    str(data),
)

# --- demo samples (all three overall statuses) ------------------------------
for sample, expected in [
    ("biscuits", "REVIEW REQUIRED"),
    ("rice", "DECLARATIONS DETECTED"),
    ("snack", "MISSING DECLARATIONS"),
]:
    response = client.post("/analyze", json={"demo_sample": sample})
    body = response.json()
    check(
        f"POST /analyze demo={sample} → {expected}",
        response.status_code == 200
        and body.get("status") == expected
        and body.get("mode") == "demo"
        and isinstance(body.get("coverage"), int)
        and len(body.get("fields", [])) == 12
        and body.get("issues") is not None
        and body.get("suggestions"),
        f"status={body.get('status')} coverage={body.get('coverage')}",
    )

# --- QR-only flow (QR is an optional first information source) --------------
response = client.post(
    "/analyze",
    json={
        "qr_data": "https://example.in/v?mrp=99&batch=B-77&fssai=10012345678901"
    },
)
body = response.json()
check(
    "QR payload parsed as first source",
    response.status_code == 200
    and body.get("source") == "QR"
    and body.get("qr_detected") is True
    and body.get("mrp") == "₹99"
    and body.get("qr_details"),
    f"source={body.get('source')} mrp={body.get('mrp')}",
)

# --- error handling ---------------------------------------------------------
response = client.post("/analyze", json={})
check("empty payload → 400", response.status_code == 400, str(response.status_code))

response = client.post(
    "/analyze", json={"front_image": "data:image/jpeg;base64,AAAA"}
)
check(
    "undecodable image → friendly 200 (no crash, nothing invented)",
    response.status_code == 200,
    str(response.status_code),
)

# --- SPA serving ------------------------------------------------------------
response = client.get("/")
check(
    "GET / serves the SPA",
    response.status_code == 200 and '<div id="root">' in response.text,
)
response = client.get("/scanner")
check(
    "GET /scanner falls back to the SPA",
    response.status_code == 200 and '<div id="root">' in response.text,
)
response = client.get("/assets/does-not-exist.js")
check("missing asset → 404", response.status_code == 404, str(response.status_code))

print()
if failures:
    print(f"FAILURES: {failures}")
    sys.exit(1)
print("ALL SMOKE TESTS PASSED")
