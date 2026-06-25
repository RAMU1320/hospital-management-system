# Smart Hospital Management System — PRD

## Original Problem Statement
Build a full-stack Smart Hospital Management System with 4 roles (Admin, Doctor, Patient, Receptionist), role-based dashboards, appointment booking, prescriptions, billing with PDF invoices, department management, and analytics. Originally requested in Java/Spring Boot/MySQL but redirected to FastAPI + React + MongoDB (user choice "B") for live preview deployment.

## Stack (chosen)
- Backend: FastAPI (Python), MongoDB (motor)
- Frontend: React 19 + Tailwind + shadcn/ui + Recharts
- Auth: JWT (httpOnly cookies) + bcrypt, 4 roles
- PDF: ReportLab
- Email: Stubbed (logged via logger)

## User Personas
1. **Admin** — Manages doctors, receptionists, departments; sees KPIs.
2. **Doctor** — Sees today's appointments, writes prescriptions, manages own availability.
3. **Receptionist** — Walk-in registration, books appointments, generates invoices.
4. **Patient** — Self-registers, books appointments, views history, downloads invoices.

## Core Requirements (static)
- Secure login + RBAC
- CRUD for doctors, receptionists, departments, appointments, prescriptions, billing
- Stats dashboard (Admin)
- PDF invoice generation
- Search + pagination on list views
- Responsive UI

## Implemented (2026-06-24)
- JWT auth (register/login/logout/me) with httpOnly cookies + bcrypt
- 4 role-protected route trees with sidebar nav
- Admin: dashboard KPIs + 7-day chart, doctors, receptionists, patients, appointments, departments, billing
- Doctor: today view, write prescription dialog, all appointments, patient lookup with history, schedule editor
- Receptionist: KPI overview, walk-in registration, book appointment on behalf, billing CRUD
- Patient: home shortcuts, 3-step booking wizard, my appointments + cancel, medical history timeline, invoice download
- Billing PDF via ReportLab (clean clinical invoice layout)
- Seed data: 1 admin, 2 doctors, 1 receptionist, 2 patients, 4 appointments, 1 prescription, 3 bills

## Test Credentials
See `/app/memory/test_credentials.md`.

## Backlog (P1/P2)
- **P1**: Wire real SMTP via JavaMailSender-equivalent (e.g., SendGrid/Resend) for booking confirmations.
- **P1**: Pagination on appointments and billing tables (only patients page paginates currently).
- **P2**: Doctor slot-based availability picker (currently free-form text).
- **P2**: Payments online (Stripe) so patients can pay invoices instead of cash-at-desk.
- **P2**: Per-doctor analytics for admin.
- **P2**: Email/SMS reminders 24h before appointment.

## Next Action Items
1. Connect a real email provider for confirmations + reminders.
2. Add online payment to Patient invoices page (Stripe).
3. Build a slot-based doctor calendar.
