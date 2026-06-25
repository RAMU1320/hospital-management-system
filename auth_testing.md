# Auth Testing Notes — Hospital Management System

## Stack
- JWT in httpOnly cookie (`access_token`), 12h expiry
- bcrypt password hashing
- 4 roles: admin, doctor, receptionist, patient
- Login endpoint: `POST /api/auth/login` body `{email, password}`
- Me endpoint: `GET /api/auth/me`
- Register endpoint (creates patient): `POST /api/auth/register`

## Sample login (admin)
```
curl -c c.txt -X POST {BASE}/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@hospital.com","password":"admin123"}'
curl -b c.txt {BASE}/api/auth/me
```

## All seeded accounts
See `/app/memory/test_credentials.md`.

## RBAC matrix (key endpoints)
- `/api/admin/stats` → admin only
- `/api/doctors POST/DELETE` → admin only
- `/api/receptionists` → admin only
- `/api/patients/walk-in` → admin, receptionist
- `/api/prescriptions POST` → doctor only (own appointment)
- `/api/billing POST` → admin, receptionist
- `/api/billing/{id}/invoice.pdf` → any authenticated; patient gets own only
- `/api/appointments POST` → patient (creates own) or admin/receptionist (with patient_id)
