"""End-to-end backend API tests for Smart Hospital Management System.

Covers auth, RBAC, admin stats, doctor/receptionist/patient CRUD, appointments,
prescriptions, billing & PDF invoice.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or "https://health-admin-portal-2.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@hospital.com", "password": "admin123"}
DOC1 = {"email": "aarav@hospital.com", "password": "doctor123"}
RECEP = {"email": "reception@hospital.com", "password": "recep123"}
PAT1 = {"email": "sara@example.com", "password": "patient123"}
PAT2 = {"email": "michael@example.com", "password": "patient123"}


def _login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.status_code} {r.text}"
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    return s, data


# ---------- Auth ----------
class TestAuth:
    def test_login_admin(self):
        _, d = _login(ADMIN)
        assert d["role"] == "admin"
        assert d["email"] == ADMIN["email"]

    def test_login_doctor(self):
        _, d = _login(DOC1)
        assert d["role"] == "doctor"

    def test_login_receptionist(self):
        _, d = _login(RECEP)
        assert d["role"] == "receptionist"

    def test_login_patient(self):
        _, d = _login(PAT1)
        assert d["role"] == "patient"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": "no@no.com", "password": "x"})
        assert r.status_code == 401

    def test_me_endpoint(self):
        s, d = _login(ADMIN)
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN["email"]

    def test_register_new_patient(self):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "name": "TEST Reg", "email": email, "password": "pass123", "age": 25
        })
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "patient"
        assert "token" in data


# ---------- RBAC ----------
class TestRBAC:
    def test_patient_cannot_access_admin_stats(self):
        s, _ = _login(PAT1)
        r = s.get(f"{API}/admin/stats")
        assert r.status_code == 403

    def test_doctor_cannot_access_admin_stats(self):
        s, _ = _login(DOC1)
        r = s.get(f"{API}/admin/stats")
        assert r.status_code == 403

    def test_recep_cannot_access_admin_stats(self):
        s, _ = _login(RECEP)
        r = s.get(f"{API}/admin/stats")
        assert r.status_code == 403

    def test_unauth_admin_stats(self):
        r = requests.get(f"{API}/admin/stats")
        assert r.status_code == 401


# ---------- Admin Stats ----------
class TestAdminStats:
    def test_stats_shape_and_values(self):
        s, _ = _login(ADMIN)
        r = s.get(f"{API}/admin/stats")
        assert r.status_code == 200
        d = r.json()
        assert d["total_patients"] >= 2
        assert d["total_doctors"] >= 2
        assert d["appointments_today"] >= 2
        assert d["revenue"] > 0
        assert isinstance(d["appointments_last_7_days"], list)
        assert len(d["appointments_last_7_days"]) == 7


# ---------- Doctor CRUD ----------
class TestDoctorCRUD:
    def test_create_list_delete_doctor(self):
        s, _ = _login(ADMIN)
        # departments
        deps = s.get(f"{API}/departments").json()
        assert len(deps) >= 1
        dep_id = deps[0]["id"]
        email = f"TEST_doc_{uuid.uuid4().hex[:6]}@hosp.com"
        r = s.post(f"{API}/doctors", json={
            "name": "TEST Dr X", "email": email, "password": "pass123",
            "specialization": "Pediatrics", "experience": 5, "department_id": dep_id,
        })
        assert r.status_code == 200, r.text
        did = r.json()["id"]
        # list with q
        lst = s.get(f"{API}/doctors", params={"q": "TEST Dr X"}).json()
        assert any(d["id"] == did for d in lst)
        # list with department_id
        lst2 = s.get(f"{API}/doctors", params={"department_id": dep_id}).json()
        assert any(d["id"] == did for d in lst2)
        # delete
        rd = s.delete(f"{API}/doctors/{did}")
        assert rd.status_code == 200
        lst3 = s.get(f"{API}/doctors").json()
        assert not any(d["id"] == did for d in lst3)


# ---------- Receptionist & Department & Patient CRUD ----------
class TestOtherCRUD:
    def test_dept_crud(self):
        s, _ = _login(ADMIN)
        r = s.post(f"{API}/departments", json={"name": f"TEST Dept {uuid.uuid4().hex[:4]}", "description": "x"})
        assert r.status_code == 200
        did = r.json()["id"]
        assert s.delete(f"{API}/departments/{did}").status_code == 200

    def test_receptionist_crud(self):
        s, _ = _login(ADMIN)
        email = f"TEST_rec_{uuid.uuid4().hex[:6]}@hosp.com"
        r = s.post(f"{API}/receptionists", json={"name": "TEST Rec", "email": email, "password": "pass123"})
        assert r.status_code == 200
        rid = r.json()["id"]
        lst = s.get(f"{API}/receptionists").json()
        assert any(x["id"] == rid for x in lst)
        assert s.delete(f"{API}/receptionists/{rid}").status_code == 200

    def test_walkin_patient(self):
        s, _ = _login(RECEP)
        email = f"TEST_wp_{uuid.uuid4().hex[:6]}@p.com"
        r = s.post(f"{API}/patients/walk-in", json={
            "name": "TEST Walkin", "email": email, "age": 30, "phone": "555"
        })
        assert r.status_code == 200
        pid = r.json()["id"]
        # list
        lst = s.get(f"{API}/patients", params={"q": "TEST Walkin"}).json()
        assert any(p["id"] == pid for p in lst)


# ---------- Appointment flow ----------
class TestAppointmentFlow:
    def test_patient_book_and_cancel(self):
        s, _ = _login(PAT1)
        # get doctors
        docs = s.get(f"{API}/doctors").json()
        assert len(docs) >= 1
        doctor_id = docs[0]["id"]
        from datetime import date, timedelta
        future = (date.today() + timedelta(days=3)).isoformat()
        r = s.post(f"{API}/appointments", json={
            "doctor_id": doctor_id, "date": future, "time": "10:00", "reason": "TEST checkup"
        })
        assert r.status_code == 200, r.text
        appt = r.json()
        assert appt["status"] == "pending"
        appt_id = appt["id"]
        # cancel
        rc = s.patch(f"{API}/appointments/{appt_id}/status", json={"status": "cancelled"})
        assert rc.status_code == 200
        # verify
        all_appts = s.get(f"{API}/appointments").json()
        target = [a for a in all_appts if a["id"] == appt_id][0]
        assert target["status"] == "cancelled"

    def test_patient_cannot_complete_appt(self):
        s, _ = _login(PAT1)
        docs = s.get(f"{API}/doctors").json()
        from datetime import date, timedelta
        r = s.post(f"{API}/appointments", json={
            "doctor_id": docs[0]["id"], "date": (date.today() + timedelta(days=5)).isoformat(),
            "time": "11:00", "reason": "x"
        })
        aid = r.json()["id"]
        rc = s.patch(f"{API}/appointments/{aid}/status", json={"status": "completed"})
        assert rc.status_code == 403


# ---------- Prescription ----------
class TestPrescription:
    def test_doctor_writes_prescription(self):
        # Create a fresh appointment for doctor aarav by receptionist
        rs, _ = _login(RECEP)
        # find patient sara, doctor aarav
        patients = rs.get(f"{API}/patients", params={"q": "sara"}).json()
        assert patients
        pid = patients[0]["id"]
        docs = rs.get(f"{API}/doctors").json()
        aarav = [d for d in docs if d["email"] == "aarav@hospital.com"][0]
        from datetime import date
        today = date.today().isoformat()
        r = rs.post(f"{API}/appointments", json={
            "doctor_id": aarav["id"], "patient_id": pid,
            "date": today, "time": "15:30", "reason": "TEST presc"
        })
        assert r.status_code == 200
        aid = r.json()["id"]
        # doctor writes prescription
        ds, _ = _login(DOC1)
        rp = ds.post(f"{API}/prescriptions", json={
            "appointment_id": aid, "medicines": "TEST Med 10mg", "notes": "rest"
        })
        assert rp.status_code == 200
        # status flips to completed
        appts = ds.get(f"{API}/appointments").json()
        match = [a for a in appts if a["id"] == aid]
        assert match and match[0]["status"] == "completed"


# ---------- Billing & PDF ----------
class TestBillingPDF:
    def test_create_and_pay_billing(self):
        s, _ = _login(RECEP)
        patients = s.get(f"{API}/patients", params={"q": "sara"}).json()
        pid = patients[0]["id"]
        r = s.post(f"{API}/billing", json={
            "patient_id": pid, "amount": 250.0, "description": "TEST bill", "paid_status": "unpaid"
        })
        assert r.status_code == 200
        bid = r.json()["id"]
        # mark paid
        rp = s.patch(f"{API}/billing/{bid}/pay")
        assert rp.status_code == 200
        # verify
        lst = s.get(f"{API}/billing").json()
        target = [b for b in lst if b["id"] == bid][0]
        assert target["paid_status"] == "paid"

    def test_patient_pdf_own_bill(self):
        # patient sara's billing
        ps, _ = _login(PAT1)
        bills = ps.get(f"{API}/billing").json()
        assert bills, "no bills for patient"
        bid = bills[0]["id"]
        r = ps.get(f"{API}/billing/{bid}/invoice.pdf")
        assert r.status_code == 200
        assert "application/pdf" in r.headers.get("content-type", "")
        assert len(r.content) > 500
        assert r.content[:4] == b"%PDF"

    def test_patient_cannot_access_others_pdf(self):
        # get bill of pat1 then try with pat2
        ps1, _ = _login(PAT1)
        bills = ps1.get(f"{API}/billing").json()
        assert bills
        bid = bills[0]["id"]
        ps2, _ = _login(PAT2)
        r = ps2.get(f"{API}/billing/{bid}/invoice.pdf")
        assert r.status_code == 403

    def test_recep_can_access_any_pdf(self):
        ps, _ = _login(PAT1)
        bid = ps.get(f"{API}/billing").json()[0]["id"]
        rs, _ = _login(RECEP)
        r = rs.get(f"{API}/billing/{bid}/invoice.pdf")
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"
