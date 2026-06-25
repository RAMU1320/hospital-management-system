"""Email + scheduler module for MediCare Hospital.

Sends transactional emails via Resend. Falls back to stub-logging if RESEND_API_KEY
is missing or invalid so the rest of the app keeps working in dev.

Templates: clean HTML with inline CSS, single-column responsive table layout.
"""
from __future__ import annotations
import os
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import resend
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)

HOSPITAL_NAME = "MediCare Hospital"
HOSPITAL_ADDRESS = "123 Healthway, Clinical District"
BRAND_COLOR = "#1d4ed8"  # blue-700


def _key_configured() -> bool:
    k = os.environ.get("RESEND_API_KEY", "")
    return bool(k) and not k.lower().startswith("re_x") and k != "re_xxxxxxxxxxxxxxxx"


def _sender() -> str:
    return os.environ.get("SENDER_EMAIL") or "MediCare Hospital <onboarding@resend.dev>"


async def _send_email(to: list[str], subject: str, html: str, cc: Optional[list[str]] = None) -> dict:
    """Send via Resend in a thread; stub-log if key is missing/placeholder."""
    if not _key_configured():
        logger.info(f"[EMAIL STUB] to={to} cc={cc} subject={subject!r}")
        return {"stub": True}

    resend.api_key = os.environ["RESEND_API_KEY"]
    params = {"from": _sender(), "to": to, "subject": subject, "html": html}
    if cc:
        params["cc"] = cc
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"[EMAIL SENT] id={result.get('id')} to={to} subject={subject!r}")
        return result
    except Exception as e:
        # Don't crash the request path on email errors — log only
        logger.warning(f"[EMAIL FAIL] to={to} subject={subject!r} err={e}")
        return {"error": str(e)}


# ---------- Templates ----------
def _shell(body_html: str) -> str:
    """Outer email shell: header, body slot, footer."""
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f5f5f4;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #e2e8f0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr>
          <td style="width:40px;"><div style="width:40px;height:40px;background:{BRAND_COLOR};border-radius:6px;color:#ffffff;text-align:center;line-height:40px;font-weight:700;font-size:18px;">M</div></td>
          <td style="padding-left:12px;"><div style="font-weight:600;font-size:16px;letter-spacing:-0.01em;">{HOSPITAL_NAME}</div><div style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">Hospital OS</div></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:32px;">{body_html}</td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#fafaf9;color:#64748b;font-size:12px;line-height:1.5;">
        {HOSPITAL_NAME} &middot; {HOSPITAL_ADDRESS}<br>
        This is an automated message. Reply to this email and we'll get back to you.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""


def _details_table(patient_name: str, doctor_name: str, specialization: str, date: str, time: str) -> str:
    rows = [
        ("Patient", patient_name),
        ("Doctor", f"{doctor_name} · {specialization}" if specialization else doctor_name),
        ("Date", date),
        ("Time", time),
        ("Location", HOSPITAL_ADDRESS),
    ]
    body = ""
    for label, value in rows:
        body += (
            f'<tr>'
            f'<td style="padding:10px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;width:120px;">{label}</td>'
            f'<td style="padding:10px 0;color:#0f172a;font-size:15px;font-weight:500;">{value}</td>'
            f'</tr>'
        )
    return f'<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid #e2e8f0;margin-top:16px;">{body}</table>'


def confirmation_html(patient_name, doctor_name, specialization, date, time) -> str:
    body = f"""
    <div style="font-size:14px;color:#64748b;margin-bottom:8px;letter-spacing:0.04em;text-transform:uppercase;">Appointment confirmed</div>
    <h1 style="margin:0 0 16px 0;font-size:24px;color:#0f172a;font-weight:600;letter-spacing:-0.015em;">Hello {patient_name},</h1>
    <p style="margin:0 0 16px 0;font-size:15px;color:#334155;line-height:1.6;">Your appointment with <strong>{doctor_name}</strong> is confirmed. We've added the details below — please save this email for your records.</p>
    {_details_table(patient_name, doctor_name, specialization, date, time)}
    <div style="margin-top:24px;padding:12px 16px;background:#eff6ff;border-radius:8px;color:#1e40af;font-size:13px;line-height:1.5;">
      Need to reschedule? Sign in to your patient portal anytime to make changes.
    </div>
    """
    return _shell(body)


def reminder_html(patient_name, doctor_name, specialization, date, time) -> str:
    body = f"""
    <div style="font-size:14px;color:#b45309;margin-bottom:8px;letter-spacing:0.04em;text-transform:uppercase;">Reminder · 24 hours</div>
    <h1 style="margin:0 0 16px 0;font-size:24px;color:#0f172a;font-weight:600;letter-spacing:-0.015em;">See you tomorrow, {patient_name}.</h1>
    <p style="margin:0 0 16px 0;font-size:15px;color:#334155;line-height:1.6;">This is a friendly reminder that you have an appointment tomorrow with <strong>{doctor_name}</strong>.</p>
    {_details_table(patient_name, doctor_name, specialization, date, time)}
    <div style="margin-top:24px;padding:12px 16px;background:#fffbeb;border-radius:8px;color:#92400e;font-size:13px;line-height:1.5;">
      <strong>Please arrive 10 minutes early</strong> to complete check-in paperwork.
    </div>
    """
    return _shell(body)


def cancellation_html(patient_name, doctor_name, specialization, date, time) -> str:
    body = f"""
    <div style="font-size:14px;color:#b91c1c;margin-bottom:8px;letter-spacing:0.04em;text-transform:uppercase;">Appointment cancelled</div>
    <h1 style="margin:0 0 16px 0;font-size:24px;color:#0f172a;font-weight:600;letter-spacing:-0.015em;">Hello {patient_name},</h1>
    <p style="margin:0 0 16px 0;font-size:15px;color:#334155;line-height:1.6;">Your appointment with <strong>{doctor_name}</strong> has been cancelled.</p>
    {_details_table(patient_name, doctor_name, specialization, date, time)}
    <div style="margin-top:24px;">
      <a href="#" style="display:inline-block;background:{BRAND_COLOR};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:500;font-size:14px;">Book a new appointment</a>
    </div>
    <p style="margin-top:16px;font-size:13px;color:#64748b;">You can book a new appointment anytime through your patient portal.</p>
    """
    return _shell(body)


# ---------- Public send helpers ----------
async def send_confirmation(patient: dict, doctor: dict, appt: dict):
    if not patient or not patient.get("email"):
        return
    subject = f"Appointment Confirmed — {doctor['name']} on {appt['date']} at {appt['time']}"
    html = confirmation_html(patient["name"], doctor["name"], doctor.get("specialization") or "", appt["date"], appt["time"])
    cc = [doctor["email"]] if doctor.get("email") else None
    await _send_email([patient["email"]], subject, html, cc=cc)


async def send_reminder(patient: dict, doctor: dict, appt: dict):
    if not patient or not patient.get("email"):
        return
    subject = f"Reminder: Your appointment tomorrow at {appt['time']}"
    html = reminder_html(patient["name"], doctor["name"], doctor.get("specialization") or "", appt["date"], appt["time"])
    await _send_email([patient["email"]], subject, html)


async def send_cancellation(patient: dict, doctor: dict, appt: dict):
    if not patient or not patient.get("email"):
        return
    subject = f"Appointment Cancelled — {appt['date']} at {appt['time']}"
    html = cancellation_html(patient["name"], doctor["name"], doctor.get("specialization") or "", appt["date"], appt["time"])
    await _send_email([patient["email"]], subject, html)


# ---------- Scheduler ----------
def make_reminder_job(db):
    """Returns an async function that scans for tomorrow's appointments and sends reminders once."""
    async def run_reminders():
        try:
            tomorrow = (datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()
            cursor = db.appointments.find({
                "date": tomorrow,
                "status": {"$nin": ["cancelled", "completed"]},
                "$or": [{"reminder_sent": {"$exists": False}}, {"reminder_sent": False}],
            }, {"_id": 0})
            appts = await cursor.to_list(500)
            if not appts:
                logger.info(f"[REMINDER JOB] no pending reminders for {tomorrow}")
                return
            for a in appts:
                patient = await db.patients.find_one({"id": a["patient_id"]}, {"_id": 0})
                doctor = await db.doctors.find_one({"id": a["doctor_id"]}, {"_id": 0})
                if patient and doctor:
                    await send_reminder(patient, doctor, a)
                    await db.appointments.update_one({"id": a["id"]}, {"$set": {"reminder_sent": True}})
            logger.info(f"[REMINDER JOB] processed {len(appts)} reminder(s) for {tomorrow}")
        except Exception as e:
            logger.warning(f"[REMINDER JOB] error: {e}")
    return run_reminders


def start_scheduler(db) -> AsyncIOScheduler:
    sched = AsyncIOScheduler(timezone="UTC")
    job = make_reminder_job(db)
    # Hourly cadence
    sched.add_job(job, "interval", hours=1, id="appointment_reminders", next_run_time=datetime.now(timezone.utc) + timedelta(seconds=30))
    sched.start()
    logger.info(f"[SCHEDULER] started · reminder job every 1h · resend_configured={_key_configured()}")
    return sched
