"""Iteration 7 — Admin Portal (Google-only auth) backend tests.
Uses pre-seeded session tokens from /app/memory/test_credentials.md.
"""
import os
import uuid
import pytest
import requests
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

load_dotenv("/app/backend/.env")

BASE_URL = "https://report-now-8.preview.emergentagent.com"
try:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
except Exception:
    pass
API = f"{BASE_URL}/api"

SUPER = "test_super_sess"
GOV = "test_gov_sess"
CONTRACTOR = "test_contractor_sess"
NEW = "test_new_sess"


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------------- Auth gating ----------------
def test_admin_me_no_token():
    r = requests.get(f"{API}/admin/me")
    assert r.status_code == 401


def test_admin_issues_no_token():
    r = requests.get(f"{API}/admin/issues")
    assert r.status_code == 401


def test_admin_me_super():
    r = requests.get(f"{API}/admin/me", headers=H(SUPER))
    assert r.status_code == 200
    d = r.json()
    assert d["email"] == "sinpi3323@gmail.com"
    assert d["role"] == "super_admin"
    assert d["status"] == "approved"
    assert "_id" not in d


def test_admin_me_new_pending():
    r = requests.get(f"{API}/admin/me", headers=H(NEW))
    assert r.status_code == 200
    d = r.json()
    assert d["profile_complete"] is False
    assert d["status"] == "pending"


def test_new_admin_blocked_from_issues():
    """profile-incomplete admin can't hit dashboard data endpoints."""
    r = requests.get(f"{API}/admin/issues", headers=H(NEW))
    assert r.status_code == 403


# ---------------- Metrics scoping ----------------
def test_super_metrics_29():
    r = requests.get(f"{API}/admin/metrics", headers=H(SUPER))
    assert r.status_code == 200
    m = r.json()
    assert m["role"] == "super_admin"
    assert m["total"] == 29


def test_gov_metrics_scoped():
    r = requests.get(f"{API}/admin/metrics", headers=H(GOV))
    assert r.status_code == 200
    m = r.json()
    assert m["role"] == "admin"
    assert m["admin_type"] == "government_official"
    assert m["jurisdiction"]["state"] == "Haryana"
    assert m["total"] == 27, m


def test_contractor_metrics_only_assigned():
    r = requests.get(f"{API}/admin/metrics", headers=H(CONTRACTOR))
    assert r.status_code == 200
    m = r.json()
    assert m["admin_type"] == "private_contractor"
    assert m["total"] == 2, m


# ---------------- Issues scoping ----------------
def test_super_sees_all_issues():
    r = requests.get(f"{API}/admin/issues", headers=H(SUPER))
    assert r.status_code == 200
    lst = r.json()
    assert len(lst) == 29


def test_gov_sees_only_haryana():
    r = requests.get(f"{API}/admin/issues", headers=H(GOV))
    assert r.status_code == 200
    lst = r.json()
    assert len(lst) == 27
    for i in lst:
        assert i.get("state") == "Haryana"


def test_contractor_sees_only_assigned():
    r = requests.get(f"{API}/admin/issues", headers=H(CONTRACTOR))
    assert r.status_code == 200
    lst = r.json()
    assert len(lst) == 2


# ---------------- Contractors endpoint ----------------
def test_super_lists_contractors():
    r = requests.get(f"{API}/admin/contractors", headers=H(SUPER))
    assert r.status_code == 200
    names = [c.get("company_name") for c in r.json()]
    assert "BuildRight Pvt Ltd" in names


def test_gov_lists_contractors():
    r = requests.get(f"{API}/admin/contractors", headers=H(GOV))
    assert r.status_code == 200
    assert any(c.get("company_name") == "BuildRight Pvt Ltd" for c in r.json())


def test_contractor_cannot_list_contractors():
    r = requests.get(f"{API}/admin/contractors", headers=H(CONTRACTOR))
    assert r.status_code == 403


# ---------------- Assign flow (officials only) ----------------
async def _pick_issue_for_gov():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    issue = await db.issues.find_one({"state": "Haryana", "district": "Gurugram"}, {"_id": 0, "id": 1})
    contractor = await db.admins.find_one({"admin_type": "private_contractor"}, {"_id": 0, "admin_id": 1})
    return issue["id"], contractor["admin_id"]


def test_gov_can_assign_and_status():
    iid, contractor_id = asyncio.run(_pick_issue_for_gov())
    r = requests.patch(f"{API}/admin/issues/{iid}/assign",
                       json={"assigned_admin_id": contractor_id, "assigned_team": "Roads-A"},
                       headers=H(GOV))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["assigned_admin_id"] == contractor_id
    assert d["assigned_admin_name"] == "BuildRight Pvt Ltd"

    # status change
    r = requests.patch(f"{API}/admin/issues/{iid}/status",
                       json={"status": "in_progress", "note": "TEST_iter7"}, headers=H(GOV))
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"


def test_contractor_cannot_assign():
    iid, contractor_id = asyncio.run(_pick_issue_for_gov())
    r = requests.patch(f"{API}/admin/issues/{iid}/assign",
                       json={"assigned_admin_id": contractor_id}, headers=H(CONTRACTOR))
    assert r.status_code == 403


def test_contractor_cannot_change_category():
    iid, _ = asyncio.run(_pick_issue_for_gov())
    r = requests.patch(f"{API}/admin/issues/{iid}/category",
                       json={"category": "garbage"}, headers=H(CONTRACTOR))
    assert r.status_code == 403


def test_contractor_can_update_status_on_assigned():
    """After test_gov_can_assign_and_status ran, contractor has ≥1 assigned issue."""
    r = requests.get(f"{API}/admin/issues", headers=H(CONTRACTOR))
    assert r.status_code == 200
    issues = r.json()
    assert len(issues) >= 1
    iid = issues[0]["id"]
    r = requests.patch(f"{API}/admin/issues/{iid}/status",
                       json={"status": "in_progress", "note": "TEST_contractor"}, headers=H(CONTRACTOR))
    assert r.status_code == 200


# ---------------- Profile submit flow ----------------
async def _reset_new_admin():
    """Reset test_new_sess admin back to pending/profile_incomplete."""
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    await db.admins.update_one(
        {"email": "admin.new@fixmyarea.test"},
        {"$set": {
            "profile_complete": False, "status": "pending", "admin_type": None,
            "department": "", "employee_id": "",
            "jurisdiction": {"state": "", "district": "", "ward": ""},
            "company_name": "", "contract_license_id": "",
        }},
    )


def test_profile_submit_and_pending_and_approve():
    asyncio.run(_reset_new_admin())
    # confirm reset
    r = requests.get(f"{API}/admin/me", headers=H(NEW))
    assert r.json()["profile_complete"] is False
    # submit profile
    r = requests.post(f"{API}/admin/profile", headers=H(NEW), json={
        "admin_type": "government_official",
        "phone": "+919999900000",
        "department": "Public Works",
        "employee_id": "EMP-TEST-1",
        "state": "Haryana",
        "district": "Gurugram",
    })
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["profile_complete"] is True
    assert d["status"] == "pending"
    assert d["admin_type"] == "government_official"
    assert d["jurisdiction"]["state"] == "Haryana"

    # super sees pending request
    r = requests.get(f"{API}/admin/requests", headers=H(SUPER))
    assert r.status_code == 200
    reqs = r.json()
    match = [a for a in reqs if a["email"] == "admin.new@fixmyarea.test"]
    assert len(match) == 1
    admin_id = match[0]["admin_id"]

    # approve
    r = requests.post(f"{API}/admin/requests/{admin_id}/approve", headers=H(SUPER))
    assert r.status_code == 200

    # confirm approved
    r = requests.get(f"{API}/admin/me", headers=H(NEW))
    assert r.json()["status"] == "approved"

    # cleanup: reset back
    asyncio.run(_reset_new_admin())


def test_profile_contractor_shape():
    asyncio.run(_reset_new_admin())
    r = requests.post(f"{API}/admin/profile", headers=H(NEW), json={
        "admin_type": "private_contractor",
        "phone": "+919999900001",
        "company_name": "TEST_Cons Co",
        "contract_license_id": "LIC-XYZ",
    })
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["admin_type"] == "private_contractor"
    assert d["company_name"] == "TEST_Cons Co"
    asyncio.run(_reset_new_admin())


# ---------------- RBAC negative ----------------
def test_gov_cannot_super_approve():
    r = requests.get(f"{API}/admin/requests", headers=H(GOV))
    assert r.status_code == 403
