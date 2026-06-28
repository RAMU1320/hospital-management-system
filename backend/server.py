from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import json
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta, date, time as dtime
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
import stripe
from email_service import (
    send_confirmation, send_cancellation, start_scheduler,
)

# ---------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ---------- App ----------
app = FastAPI(title="Smart Hospital Management System")
api = APIRouter(prefix="/api")

# ---------- Auth helpers ----------
JWT_ALGO = "HS256"
ROLES = ("admin", "doctor", "receptionist", "patient")


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGO)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_roles(*allowed):
    async def checker(user: dict = Depends(get_current_user)):
        if user["role"] not in allowed:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return checker


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True,
        secure=True, samesite="none", max_age=12 * 3600, path="/",
    )


# ---------- Models ----------
class RegisterPayload(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    age: Optional[int] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class DepartmentIn(BaseModel):
    name: str
    description: Optional[str] = ""


class DoctorIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    specialization: str
    experience: int = 0
    department_id: Optional[str] = None
    availability: Optional[str] = "Mon-Fri 9:00-17:00"


class ReceptionistIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    phone: Optional[str] = ""


class WalkInPatientIn(BaseModel):
    name: str
    email: EmailStr
    password: Optional[str] = "patient123"
    age: Optional[int] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class AppointmentIn(BaseModel):
    doctor_id: str
    patient_id: Optional[str] = None  # required for receptionist; auto for patient
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    reason: Optional[str] = ""


class AppointmentStatusUpdate(BaseModel):
    status: Literal["pending", "confirmed", "completed", "cancelled"]


class PrescriptionIn(BaseModel):
    appointment_id: str
    medicines: str
    notes: Optional[str] = ""


class BillingIn(BaseModel):
    patient_id: str
    appointment_id: Optional[str] = None
    amount: float
    description: Optional[str] = "Consultation"
    paid_status: Literal["paid", "unpaid"] = "unpaid"


class AvailabilityUpdate(BaseModel):
    availability: str


# Weekly schedule: { "mon": {"enabled": true, "start": "09:00", "end": "17:00"}, ... }
DEFAULT_WEEKLY_SCHEDULE = {
    "mon": {"enabled": True, "start": "09:00", "end": "17:00"},
    "tue": {"enabled": True, "start": "09:00", "end": "17:00"},
    "wed": {"enabled": True, "start": "09:00", "end": "17:00"},
    "thu": {"enabled": True, "start": "09:00", "end": "17:00"},
    "fri": {"enabled": True, "start": "09:00", "end": "17:00"},
    "sat": {"enabled": False, "start": "09:00", "end": "13:00"},
    "sun": {"enabled": False, "start": "09:00", "end": "13:00"},
}
DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


class DaySchedule(BaseModel):
    enabled: bool = True
    start: str = "09:00"
    end: str = "17:00"


class ScheduleUpdate(BaseModel):
    weekly_schedule: dict
    slot_duration: int = 30  # minutes



# ---------- Utils ----------
def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean(doc: Optional[dict]) -> Optional[dict]:
    if not doc:
        return None
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


# ---------- Auth endpoints ----------
@api.post("/auth/register")
async def register(payload: RegisterPayload, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = new_id()
    user_doc = {
        "id": uid,
        "name": payload.name,
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": "patient",
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)
    pid = new_id()
    await db.patients.insert_one({
        "id": pid,
        "user_id": uid,
        "name": payload.name,
        "email": email,
        "age": payload.age,
        "blood_group": payload.blood_group,
        "phone": payload.phone,
        "address": payload.address,
        "created_at": now_iso(),
    })
    token = create_access_token(uid, email, "patient")
    set_auth_cookie(response, token)
    return {"id": uid, "name": payload.name, "email": email, "role": "patient", "token": token}


@api.post("/auth/login")
async def login(payload: LoginPayload, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["id"], user["email"], user["role"])
    set_auth_cookie(response, token)
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "token": token,
    }


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------- Departments ----------
@api.get("/departments")
async def list_departments(user: dict = Depends(get_current_user)):
    items = await db.departments.find({}, {"_id": 0}).to_list(500)
    return items


@api.post("/departments")
async def create_department(payload: DepartmentIn, user: dict = Depends(require_roles("admin"))):
    doc = {"id": new_id(), "name": payload.name, "description": payload.description, "created_at": now_iso()}
    await db.departments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/departments/{dep_id}")
async def delete_department(dep_id: str, user: dict = Depends(require_roles("admin"))):
    await db.departments.delete_one({"id": dep_id})
    return {"ok": True}


# ---------- Doctors ----------
@api.get("/doctors")
async def list_doctors(
    user: dict = Depends(get_current_user),
    q: Optional[str] = None,
    department_id: Optional[str] = None,
):
    query = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"specialization": {"$regex": q, "$options": "i"}},
        ]
    if department_id:
        query["department_id"] = department_id
    docs = await db.doctors.find(query, {"_id": 0}).to_list(500)
    # attach department name
    depts = {d["id"]: d["name"] for d in await db.departments.find({}, {"_id": 0}).to_list(500)}
    for d in docs:
        d["department_name"] = depts.get(d.get("department_id"))
    return docs


@api.post("/doctors")
async def create_doctor(payload: DoctorIn, user: dict = Depends(require_roles("admin"))):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = new_id()
    await db.users.insert_one({
        "id": uid, "name": payload.name, "email": email,
        "password_hash": hash_password(payload.password),
        "role": "doctor", "created_at": now_iso(),
    })
    did = new_id()
    doctor_doc = {
        "id": did, "user_id": uid, "name": payload.name, "email": email,
        "specialization": payload.specialization, "experience": payload.experience,
        "department_id": payload.department_id, "availability": payload.availability,
        "weekly_schedule": DEFAULT_WEEKLY_SCHEDULE,
        "slot_duration": 30,
        "created_at": now_iso(),
    }
    await db.doctors.insert_one(doctor_doc)
    doctor_doc.pop("_id", None)
    return doctor_doc


@api.delete("/doctors/{doctor_id}")
async def delete_doctor(doctor_id: str, user: dict = Depends(require_roles("admin"))):
    doc = await db.doctors.find_one({"id": doctor_id})
    if doc:
        await db.users.delete_one({"id": doc["user_id"]})
    await db.doctors.delete_one({"id": doctor_id})
    return {"ok": True}


@api.patch("/doctors/me/availability")
async def update_my_availability(payload: AvailabilityUpdate, user: dict = Depends(require_roles("doctor"))):
    await db.doctors.update_one({"user_id": user["id"]}, {"$set": {"availability": payload.availability}})
    return {"ok": True}


@api.patch("/doctors/me/schedule")
async def update_my_schedule(payload: ScheduleUpdate, user: dict = Depends(require_roles("doctor"))):
    # Validate keys/values lightly
    cleaned = {}
    for k in DAY_KEYS:
        v = payload.weekly_schedule.get(k) or {}
        cleaned[k] = {
            "enabled": bool(v.get("enabled", False)),
            "start": str(v.get("start", "09:00"))[:5] or "09:00",
            "end": str(v.get("end", "17:00"))[:5] or "17:00",
        }
    dur = max(5, min(int(payload.slot_duration or 30), 240))
    await db.doctors.update_one(
        {"user_id": user["id"]},
        {"$set": {"weekly_schedule": cleaned, "slot_duration": dur}},
    )
    return {"ok": True, "weekly_schedule": cleaned, "slot_duration": dur}


def _generate_slots(day_cfg: dict, slot_duration: int) -> list:
    if not day_cfg or not day_cfg.get("enabled"):
        return []
    try:
        sh, sm = [int(x) for x in str(day_cfg["start"]).split(":")[:2]]
        eh, em = [int(x) for x in str(day_cfg["end"]).split(":")[:2]]
    except Exception:
        return []
    start_min = sh * 60 + sm
    end_min = eh * 60 + em
    if end_min <= start_min:
        return []
    out = []
    t = start_min
    while t + slot_duration <= end_min:
        out.append(f"{t // 60:02d}:{t % 60:02d}")
        t += slot_duration
    return out


@api.get("/doctors/{doctor_id}/slots")
async def doctor_slots(doctor_id: str, date: str, user: dict = Depends(get_current_user)):
    """Return available slots (HH:MM) for the given doctor on given YYYY-MM-DD date."""
    doc = await db.doctors.find_one({"id": doctor_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    try:
        target = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date (YYYY-MM-DD)")
    schedule = doc.get("weekly_schedule") or DEFAULT_WEEKLY_SCHEDULE
    slot_duration = int(doc.get("slot_duration") or 30)
    day_key = DAY_KEYS[target.weekday()]
    all_slots = _generate_slots(schedule.get(day_key) or {}, slot_duration)
    # Filter out taken
    taken_docs = await db.appointments.find(
        {"doctor_id": doctor_id, "date": date, "status": {"$ne": "cancelled"}},
        {"_id": 0, "time": 1},
    ).to_list(500)
    taken = {t["time"] for t in taken_docs}
    # If target is today, drop past slots
    now = datetime.now(timezone.utc)
    if target == now.date():
        cutoff = now.hour * 60 + now.minute
        available = [s for s in all_slots if s not in taken and (int(s[:2]) * 60 + int(s[3:])) > cutoff]
    else:
        available = [s for s in all_slots if s not in taken]
    return {
        "doctor_id": doctor_id,
        "date": date,
        "slot_duration": slot_duration,
        "slots": available,
        "all_slots": all_slots,
        "taken": sorted(taken),
        "day_enabled": bool((schedule.get(day_key) or {}).get("enabled")),
    }


@api.get("/doctors/me/profile")
async def my_doctor_profile(user: dict = Depends(require_roles("doctor"))):
    doc = await db.doctors.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doc


# ---------- Receptionists ----------
@api.get("/receptionists")
async def list_receptionists(user: dict = Depends(require_roles("admin"))):
    items = await db.receptionists.find({}, {"_id": 0}).to_list(500)
    return items


@api.post("/receptionists")
async def create_receptionist(payload: ReceptionistIn, user: dict = Depends(require_roles("admin"))):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = new_id()
    await db.users.insert_one({
        "id": uid, "name": payload.name, "email": email,
        "password_hash": hash_password(payload.password),
        "role": "receptionist", "created_at": now_iso(),
    })
    rid = new_id()
    doc = {
        "id": rid, "user_id": uid, "name": payload.name, "email": email,
        "phone": payload.phone, "created_at": now_iso(),
    }
    await db.receptionists.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/receptionists/{rid}")
async def delete_receptionist(rid: str, user: dict = Depends(require_roles("admin"))):
    r = await db.receptionists.find_one({"id": rid})
    if r:
        await db.users.delete_one({"id": r["user_id"]})
    await db.receptionists.delete_one({"id": rid})
    return {"ok": True}


# ---------- Patients ----------
@api.get("/patients")
async def list_patients(
    user: dict = Depends(require_roles("admin", "receptionist", "doctor")),
    q: Optional[str] = None,
):
    query = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
        ]
    items = await db.patients.find(query, {"_id": 0}).to_list(1000)
    return items


@api.post("/patients/walk-in")
async def walk_in_patient(payload: WalkInPatientIn, user: dict = Depends(require_roles("receptionist", "admin"))):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = new_id()
    await db.users.insert_one({
        "id": uid, "name": payload.name, "email": email,
        "password_hash": hash_password(payload.password or "patient123"),
        "role": "patient", "created_at": now_iso(),
    })
    pid = new_id()
    doc = {
        "id": pid, "user_id": uid, "name": payload.name, "email": email,
        "age": payload.age, "blood_group": payload.blood_group,
        "phone": payload.phone, "address": payload.address,
        "created_at": now_iso(),
    }
    await db.patients.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/patients/me")
async def my_patient(user: dict = Depends(require_roles("patient"))):
    p = await db.patients.find_one({"user_id": user["id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return p


# ---------- Appointments ----------
async def _hydrate_appt(appt: dict):
    appt.pop("_id", None)
    p = await db.patients.find_one({"id": appt["patient_id"]}, {"_id": 0, "name": 1, "phone": 1, "age": 1})
    d = await db.doctors.find_one({"id": appt["doctor_id"]}, {"_id": 0, "name": 1, "specialization": 1})
    appt["patient_name"] = p["name"] if p else "Unknown"
    appt["patient_phone"] = p.get("phone") if p else None
    appt["patient_age"] = p.get("age") if p else None
    appt["doctor_name"] = d["name"] if d else "Unknown"
    appt["doctor_specialization"] = d.get("specialization") if d else None
    return appt


@api.get("/appointments")
async def list_appointments(
    user: dict = Depends(get_current_user),
    q: Optional[str] = None,
    status: Optional[str] = None,
    today: Optional[bool] = False,
):
    query: dict = {}
    if user["role"] == "patient":
        p = await db.patients.find_one({"user_id": user["id"]})
        if not p:
            return []
        query["patient_id"] = p["id"]
    elif user["role"] == "doctor":
        d = await db.doctors.find_one({"user_id": user["id"]})
        if not d:
            return []
        query["doctor_id"] = d["id"]
    if status:
        query["status"] = status
    if today:
        query["date"] = datetime.now(timezone.utc).date().isoformat()
    items = await db.appointments.find(query, {"_id": 0}).sort("date", -1).to_list(2000)
    out = []
    for a in items:
        out.append(await _hydrate_appt(a))
    if q:
        ql = q.lower()
        out = [a for a in out if ql in (a.get("patient_name", "").lower() + a.get("doctor_name", "").lower() + a.get("reason", "").lower())]
    return out


@api.post("/appointments")
async def create_appointment(payload: AppointmentIn, user: dict = Depends(get_current_user)):
    if user["role"] == "patient":
        p = await db.patients.find_one({"user_id": user["id"]})
        if not p:
            raise HTTPException(status_code=400, detail="Patient profile missing")
        patient_id = p["id"]
    elif user["role"] in ("receptionist", "admin"):
        if not payload.patient_id:
            raise HTTPException(status_code=400, detail="patient_id required")
        patient_id = payload.patient_id
    else:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Reject double-booking: a non-cancelled appointment already exists for this doctor/date/time
    clash = await db.appointments.find_one({
        "doctor_id": payload.doctor_id,
        "date": payload.date,
        "time": payload.time,
        "status": {"$ne": "cancelled"},
    })
    if clash:
        raise HTTPException(status_code=409, detail="Slot already booked")

    appt = {
        "id": new_id(),
        "patient_id": patient_id,
        "doctor_id": payload.doctor_id,
        "date": payload.date,
        "time": payload.time,
        "reason": payload.reason,
        "status": "pending" if user["role"] == "patient" else "confirmed",
        "reminder_sent": False,
        "created_at": now_iso(),
    }
    await db.appointments.insert_one(appt)
    # Fire confirmation email (non-blocking — won't fail the request if Resend errors)
    patient_doc = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    doctor_doc = await db.doctors.find_one({"id": payload.doctor_id}, {"_id": 0})
    if patient_doc and doctor_doc:
        try:
            await send_confirmation(patient_doc, doctor_doc, appt)
        except Exception as e:
            logger.warning(f"Confirmation email failed: {e}")
    appt.pop("_id", None)
    return await _hydrate_appt(appt)


@api.patch("/appointments/{appt_id}/status")
async def update_appointment_status(appt_id: str, payload: AppointmentStatusUpdate, user: dict = Depends(get_current_user)):
    appt = await db.appointments.find_one({"id": appt_id})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    # Doctors can only update their own; patients only cancel their own
    if user["role"] == "doctor":
        d = await db.doctors.find_one({"user_id": user["id"]})
        if not d or appt["doctor_id"] != d["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")
    elif user["role"] == "patient":
        p = await db.patients.find_one({"user_id": user["id"]})
        if not p or appt["patient_id"] != p["id"] or payload.status != "cancelled":
            raise HTTPException(status_code=403, detail="Forbidden")
    elif user["role"] not in ("admin", "receptionist"):
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.appointments.update_one({"id": appt_id}, {"$set": {"status": payload.status}})
    return {"ok": True}


# ---------- Prescriptions ----------
@api.post("/prescriptions")
async def create_prescription(payload: PrescriptionIn, user: dict = Depends(require_roles("doctor"))):
    appt = await db.appointments.find_one({"id": payload.appointment_id})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    d = await db.doctors.find_one({"user_id": user["id"]})
    if not d or appt["doctor_id"] != d["id"]:
        raise HTTPException(status_code=403, detail="Not your appointment")
    doc = {
        "id": new_id(),
        "appointment_id": payload.appointment_id,
        "patient_id": appt["patient_id"],
        "doctor_id": appt["doctor_id"],
        "medicines": payload.medicines,
        "notes": payload.notes,
        "date": now_iso(),
    }
    await db.prescriptions.insert_one(doc)
    await db.appointments.update_one({"id": payload.appointment_id}, {"$set": {"status": "completed"}})
    doc.pop("_id", None)
    return doc


@api.get("/prescriptions")
async def list_prescriptions(user: dict = Depends(get_current_user), patient_id: Optional[str] = None):
    query: dict = {}
    if user["role"] == "patient":
        p = await db.patients.find_one({"user_id": user["id"]})
        if not p:
            return []
        query["patient_id"] = p["id"]
    elif user["role"] == "doctor":
        d = await db.doctors.find_one({"user_id": user["id"]})
        if patient_id:
            query["patient_id"] = patient_id
        else:
            if not d:
                return []
            query["doctor_id"] = d["id"]
    elif patient_id:
        query["patient_id"] = patient_id
    items = await db.prescriptions.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    # hydrate
    for it in items:
        doc = await db.doctors.find_one({"id": it["doctor_id"]}, {"_id": 0, "name": 1, "specialization": 1})
        pat = await db.patients.find_one({"id": it["patient_id"]}, {"_id": 0, "name": 1})
        it["doctor_name"] = doc["name"] if doc else "Unknown"
        it["doctor_specialization"] = doc.get("specialization") if doc else None
        it["patient_name"] = pat["name"] if pat else "Unknown"
    return items


# ---------- Billing ----------
@api.get("/billing")
async def list_billing(user: dict = Depends(get_current_user), q: Optional[str] = None):
    query: dict = {}
    if user["role"] == "patient":
        p = await db.patients.find_one({"user_id": user["id"]})
        if not p:
            return []
        query["patient_id"] = p["id"]
    items = await db.billing.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    for it in items:
        pat = await db.patients.find_one({"id": it["patient_id"]}, {"_id": 0, "name": 1, "email": 1})
        it["patient_name"] = pat["name"] if pat else "Unknown"
        it["patient_email"] = pat.get("email") if pat else None
    if q:
        ql = q.lower()
        items = [b for b in items if ql in b.get("patient_name", "").lower() or ql in b.get("description", "").lower()]
    return items


@api.post("/billing")
async def create_billing(payload: BillingIn, user: dict = Depends(require_roles("admin", "receptionist"))):
    doc = {
        "id": new_id(),
        "patient_id": payload.patient_id,
        "appointment_id": payload.appointment_id,
        "amount": payload.amount,
        "description": payload.description,
        "paid_status": payload.paid_status,
        "date": now_iso(),
    }
    await db.billing.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/billing/{bid}/pay")
async def mark_paid(bid: str, user: dict = Depends(require_roles("admin", "receptionist"))):
    await db.billing.update_one({"id": bid}, {"$set": {"paid_status": "paid"}})
    return {"ok": True}


@api.get("/billing/{bid}/invoice.pdf")
async def invoice_pdf(bid: str, user: dict = Depends(get_current_user)):
    bill = await db.billing.find_one({"id": bid}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    # Authorization: patient can only access own
    if user["role"] == "patient":
        p = await db.patients.find_one({"user_id": user["id"]})
        if not p or bill["patient_id"] != p["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")
    patient = await db.patients.find_one({"id": bill["patient_id"]}, {"_id": 0})
    appt = None
    if bill.get("appointment_id"):
        appt = await db.appointments.find_one({"id": bill["appointment_id"]}, {"_id": 0})

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm,
                            topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Heading1"], fontSize=22, textColor=colors.HexColor("#0F172A"), spaceAfter=4)
    sub = ParagraphStyle("sub", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#475569"))
    label = ParagraphStyle("lbl", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#64748B"))
    val = ParagraphStyle("val", parent=styles["Normal"], fontSize=11, textColor=colors.HexColor("#0F172A"))

    story = []
    story.append(Paragraph("MediCore Hospital", h1))
    story.append(Paragraph("123 Healthway, Clinical District &nbsp;·&nbsp; billing@medicore.com", sub))
    story.append(Spacer(1, 18))
    story.append(Paragraph(f"<b>INVOICE</b> &nbsp;·&nbsp; #{bid[:8].upper()}", val))
    story.append(Spacer(1, 14))

    meta = [
        ["Patient", patient["name"] if patient else "—", "Date", bill["date"][:10]],
        ["Email", patient.get("email", "—") if patient else "—", "Status", bill["paid_status"].upper()],
    ]
    t = Table(meta, colWidths=[2.5 * cm, 6 * cm, 2.5 * cm, 5 * cm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#64748B")),
        ("TEXTCOLOR", (2, 0), (2, -1), colors.HexColor("#64748B")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 16))

    line_items = [["Description", "Qty", "Amount"]]
    line_items.append([bill.get("description", "Consultation"), "1", f"${bill['amount']:.2f}"])
    line_items.append(["", "Total", f"${bill['amount']:.2f}"])
    lt = Table(line_items, colWidths=[10 * cm, 3 * cm, 3 * cm])
    lt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor("#0F172A")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#F8FAFC")]),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(lt)
    story.append(Spacer(1, 24))
    story.append(Paragraph("Thank you for choosing MediCore. For queries, contact billing@medicore.com.", sub))
    doc.build(story)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": f'attachment; filename="invoice-{bid[:8]}.pdf"'
    })


# ---------- Stripe Payments ----------
class CheckoutCreateIn(BaseModel):
    origin_url: str  # frontend origin, e.g. "https://app.example.com"


def _stripe_api_key() -> str:
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    return api_key


async def _mark_bill_paid_once(bill_id: str, session_id: str, payment_status: str) -> bool:
    """Idempotently mark a bill paid if payment succeeded. Returns True if it changed status now."""
    if payment_status != "paid":
        return False
    res = await db.billing.update_one(
        {"id": bill_id, "paid_status": {"$ne": "paid"}},
        {"$set": {"paid_status": "paid", "paid_at": now_iso(), "stripe_session_id": session_id}},
    )
    return res.modified_count > 0


@api.post("/billing/{bill_id}/checkout")
async def create_bill_checkout(
    bill_id: str,
    payload: CheckoutCreateIn,
    request: Request,
    user: dict = Depends(get_current_user),
):
    """Create a Stripe Checkout session for the given billing record."""
    bill = await db.billing.find_one({"id": bill_id}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    if bill["paid_status"] == "paid":
        raise HTTPException(status_code=400, detail="Bill already paid")
    # Patients may only pay their own bills
    if user["role"] == "patient":
        p = await db.patients.find_one({"user_id": user["id"]})
        if not p or bill["patient_id"] != p["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")

    origin = payload.origin_url.rstrip("/")
    success_url = f"{origin}/patient/billing?paid=1&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/patient/billing?cancelled=1"

    amount = float(bill["amount"])  # in dollars, decimal
    metadata = {
        "billing_id": bill_id,
        "patient_id": bill["patient_id"],
        "user_id": user["id"],
        "source": "hospital_billing",
    }

    stripe.api_key = _stripe_api_key()
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": int(round(amount * 100)),
                "product_data": {"name": f"Hospital Bill {bill_id[:8]}"},
            },
            "quantity": 1,
        }],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    # Persist pending transaction (required by playbook)
    await db.payment_transactions.insert_one({
        "id": new_id(),
        "session_id": session.id,
        "billing_id": bill_id,
        "patient_id": bill["patient_id"],
        "user_id": user["id"],
        "amount": amount,
        "currency": "usd",
        "metadata": metadata,
        "status": "initiated",
        "payment_status": "pending",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })

    return {"url": session.url, "session_id": session.id}


@api.get("/payments/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Poll Stripe for a checkout session's status; update DB idempotently."""
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Session not found")
    # Only the original payer (or admin/receptionist) can poll
    if user["role"] == "patient" and txn.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    stripe.api_key = _stripe_api_key()
    session = stripe.checkout.Session.retrieve(session_id)
    status_value = session.status  # "open" | "complete" | "expired"
    payment_status = session.payment_status  # "paid" | "unpaid" | "no_payment_required"
    amount_total = session.amount_total
    currency = session.currency
    metadata = dict(session.metadata or {})

    # Update transaction (idempotent — only update if status changed)
    update_set = {
        "status": status_value,
        "payment_status": payment_status,
        "amount_total": amount_total,
        "currency": currency,
        "updated_at": now_iso(),
    }
    await db.payment_transactions.update_one(
        {"session_id": session_id}, {"$set": update_set}
    )

    # Mark bill paid only once
    bill_id = (metadata or txn.get("metadata") or {}).get("billing_id") or txn.get("billing_id")
    if bill_id:
        await _mark_bill_paid_once(bill_id, session_id, payment_status)

    return {
        "session_id": session_id,
        "status": status_value,
        "payment_status": payment_status,
        "amount_total": amount_total,
        "currency": currency,
        "billing_id": bill_id,
    }


@api.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Stripe webhook: verifies signature and marks bill paid on checkout.session.completed."""
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    stripe.api_key = _stripe_api_key()
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    try:
        if webhook_secret:
            event = stripe.Webhook.construct_event(body, signature, webhook_secret)
        else:
            # No webhook secret configured (e.g. local dev) — parse without verifying signature.
            event = stripe.Event.construct_from(json.loads(body), stripe.api_key)
    except Exception as e:
        logger.warning(f"Stripe webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook")

    event_type = event.get("type") if isinstance(event, dict) else event.type
    data_object = (event.get("data", {}).get("object") if isinstance(event, dict)
                   else event.data.object)
    session_id = data_object.get("id")
    payment_status = data_object.get("payment_status")
    metadata = data_object.get("metadata", {}) or {}

    if event_type == "checkout.session.completed" and session_id:
        bill_id = metadata.get("billing_id")
        if not bill_id:
            txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0, "billing_id": 1})
            bill_id = txn.get("billing_id") if txn else None

        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": payment_status or "paid", "status": "complete", "updated_at": now_iso()}},
        )
        if bill_id:
            changed = await _mark_bill_paid_once(bill_id, session_id, payment_status or "paid")
            logger.info(f"[STRIPE WEBHOOK] bill={bill_id} session={session_id} changed={changed}")

    return {"received": True}


# ---------- Admin stats ----------
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_roles("admin"))):
    today_iso = datetime.now(timezone.utc).date().isoformat()
    total_patients = await db.patients.count_documents({})
    total_doctors = await db.doctors.count_documents({})
    total_appointments = await db.appointments.count_documents({})
    appointments_today = await db.appointments.count_documents({"date": today_iso})
    revenue_cursor = db.billing.find({"paid_status": "paid"}, {"_id": 0, "amount": 1})
    revenue = sum([b["amount"] async for b in revenue_cursor])
    pending_revenue_cursor = db.billing.find({"paid_status": "unpaid"}, {"_id": 0, "amount": 1})
    pending_revenue = sum([b["amount"] async for b in pending_revenue_cursor])
    # last 7 days appointments
    appts_by_day = {}
    for i in range(6, -1, -1):
        d = (datetime.now(timezone.utc).date() - timedelta(days=i)).isoformat()
        appts_by_day[d] = await db.appointments.count_documents({"date": d})
    return {
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "total_appointments": total_appointments,
        "appointments_today": appointments_today,
        "revenue": round(revenue, 2),
        "pending_revenue": round(pending_revenue, 2),
        "appointments_last_7_days": [{"date": k, "count": v} for k, v in appts_by_day.items()],
    }


# ---------- Seed ----------
async def seed_data():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@hospital.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")

    # Admin
    if not await db.users.find_one({"email": admin_email}):
        await db.users.insert_one({
            "id": new_id(), "name": "Hospital Admin", "email": admin_email,
            "password_hash": hash_password(admin_password), "role": "admin",
            "created_at": now_iso(),
        })

    if await db.users.count_documents({"role": "doctor"}) > 0:
        return  # already seeded demo data

    # Departments
    dep_card = {"id": new_id(), "name": "Cardiology", "description": "Heart & vascular care", "created_at": now_iso()}
    dep_neur = {"id": new_id(), "name": "Neurology", "description": "Brain & nervous system", "created_at": now_iso()}
    dep_gen = {"id": new_id(), "name": "General Medicine", "description": "Primary care", "created_at": now_iso()}
    await db.departments.insert_many([dep_card, dep_neur, dep_gen])

    # Doctors
    async def make_doctor(name, email, spec, exp, dep_id, av):
        uid = new_id()
        await db.users.insert_one({
            "id": uid, "name": name, "email": email,
            "password_hash": hash_password("doctor123"), "role": "doctor",
            "created_at": now_iso(),
        })
        did = new_id()
        await db.doctors.insert_one({
            "id": did, "user_id": uid, "name": name, "email": email,
            "specialization": spec, "experience": exp,
            "department_id": dep_id, "availability": av,
            "weekly_schedule": DEFAULT_WEEKLY_SCHEDULE,
            "slot_duration": 30,
            "created_at": now_iso(),
        })
        return did, uid

    d1_id, _ = await make_doctor("Dr. Aarav Mehta", "aarav@hospital.com", "Cardiologist", 12, dep_card["id"], "Mon-Fri 09:00-17:00")
    d2_id, _ = await make_doctor("Dr. Lina Park", "lina@hospital.com", "Neurologist", 8, dep_neur["id"], "Tue-Sat 10:00-18:00")

    # Receptionist
    ruid = new_id()
    await db.users.insert_one({
        "id": ruid, "name": "Riya Sharma", "email": "reception@hospital.com",
        "password_hash": hash_password("recep123"), "role": "receptionist",
        "created_at": now_iso(),
    })
    await db.receptionists.insert_one({
        "id": new_id(), "user_id": ruid, "name": "Riya Sharma", "email": "reception@hospital.com",
        "phone": "+1-555-0100", "created_at": now_iso(),
    })

    # Patients
    async def make_patient(name, email, age, bg, phone, addr):
        uid = new_id()
        await db.users.insert_one({
            "id": uid, "name": name, "email": email,
            "password_hash": hash_password("patient123"), "role": "patient",
            "created_at": now_iso(),
        })
        pid = new_id()
        await db.patients.insert_one({
            "id": pid, "user_id": uid, "name": name, "email": email,
            "age": age, "blood_group": bg, "phone": phone, "address": addr,
            "created_at": now_iso(),
        })
        return pid, uid

    p1_id, _ = await make_patient("Sara Johnson", "sara@example.com", 34, "O+", "+1-555-0201", "12 Oak St, City")
    p2_id, _ = await make_patient("Michael Chen", "michael@example.com", 47, "A-", "+1-555-0202", "88 Pine Ave, City")

    today = datetime.now(timezone.utc).date()
    apps = [
        {"id": new_id(), "patient_id": p1_id, "doctor_id": d1_id,
         "date": today.isoformat(), "time": "10:00", "reason": "Chest discomfort review",
         "status": "confirmed", "created_at": now_iso()},
        {"id": new_id(), "patient_id": p2_id, "doctor_id": d1_id,
         "date": today.isoformat(), "time": "11:30", "reason": "Follow-up ECG",
         "status": "pending", "created_at": now_iso()},
        {"id": new_id(), "patient_id": p2_id, "doctor_id": d2_id,
         "date": (today + timedelta(days=1)).isoformat(), "time": "14:00",
         "reason": "Migraine consultation", "status": "confirmed", "created_at": now_iso()},
        {"id": new_id(), "patient_id": p1_id, "doctor_id": d2_id,
         "date": (today - timedelta(days=7)).isoformat(), "time": "09:30",
         "reason": "Headache evaluation", "status": "completed", "created_at": now_iso()},
    ]
    await db.appointments.insert_many(apps)

    await db.prescriptions.insert_one({
        "id": new_id(), "appointment_id": apps[3]["id"],
        "patient_id": p1_id, "doctor_id": d2_id,
        "medicines": "Sumatriptan 50mg - 1 tablet at onset; Propranolol 40mg - twice daily for 30 days",
        "notes": "Avoid bright light triggers. Follow up in 4 weeks if symptoms persist.",
        "date": now_iso(),
    })

    await db.billing.insert_many([
        {"id": new_id(), "patient_id": p1_id, "appointment_id": apps[3]["id"],
         "amount": 180.0, "description": "Neurology consultation",
         "paid_status": "paid", "date": now_iso()},
        {"id": new_id(), "patient_id": p2_id, "appointment_id": apps[2]["id"],
         "amount": 220.0, "description": "Specialist consultation",
         "paid_status": "unpaid", "date": now_iso()},
        {"id": new_id(), "patient_id": p1_id, "appointment_id": apps[0]["id"],
         "amount": 150.0, "description": "Cardiology checkup",
         "paid_status": "paid", "date": now_iso()},
    ])

    logger.info("Seed data created.")


# ---------- App wiring ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.patients.create_index("user_id")
    await db.doctors.create_index("user_id")
    await db.appointments.create_index([("date", -1)])
    # Backfill weekly_schedule on legacy doctors
    await db.doctors.update_many(
        {"weekly_schedule": {"$exists": False}},
        {"$set": {"weekly_schedule": DEFAULT_WEEKLY_SCHEDULE, "slot_duration": 30}},
    )
    await seed_data()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


@api.get("/")
async def root():
    return {"message": "Smart Hospital API is running"}

if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run(app, host='0.0.0.0', port=port)
