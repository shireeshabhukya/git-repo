# Clinic Desk – Appointment Management System
Node.js (Express) REST API · PostgreSQL · React (Vite)

## Setup
Requires Node 18+ and PostgreSQL 13+.
```bash
createdb clinic
cd backend && cp .env.example .env      # edit DATABASE_URL
npm install && npm run db:init          # applies schema.sql
npm run dev                             # API on :4000

cd ../frontend && npm install && npm run dev   # UI on :5173 (proxies /api to :4000)
```
For production: `npm run build` in frontend, host `dist/`, and set `VITE_API_URL` and backend `CORS_ORIGIN`.

## Login, registration & roles
`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`. Passwords are hashed with bcrypt; login returns a JWT (8 h) sent as `Authorization: Bearer <token>`. All other `/api/*` routes return `401` without it.
Registration asks for name, mobile, email, address, user type (Receptionist or Doctor) and password. The very first account in an empty system becomes **Admin**.

| Role | Patients | Appointments | Doctors |
|---|---|---|---|
| Admin | full | full | full |
| Receptionist | full | full | view |
| Doctor | view | view | view |

Enforced on the server (`403` otherwise), and the buttons are hidden in the UI. Icons come from the Font Awesome CDN (internet needed).

## Design decisions
- **Conflict rule:** two active appointments for one doctor overlap if `existing.start < new.end AND existing.end > new.start`; back-to-back slots are allowed. Checked in the API (clear `409` message naming the clashing slot) **and** enforced by a PostgreSQL exclusion constraint (`btree_gist`), so concurrent requests can never double-book. Also applied when rescheduling (own row excluded).
- **Cancelled vs deleted:** `PATCH status=cancelled` keeps history and frees the slot. `DELETE /appointments/:id` removes the row. Patients/doctors with appointments cannot be deleted (`409`, FK `RESTRICT`); cancel/delete their appointments first.
- **Errors:** always `{ "error": { "status", "message", "details?" } }`; 400 validation (per-field `details`), 404 missing, 409 conflict/in-use, 500 generic (no stack traces).
- **Indexes:** `(appointment_date)` for date search, `(doctor_id, appointment_date, start_time, end_time)` for conflict checks.

## API
`GET/POST /api/patients`, `GET/PUT/PATCH/DELETE /api/patients/:id` (`?search=`) · same for `/api/doctors` ·
`GET /api/appointments?date=YYYY-MM-DD&doctor_id=&patient_id=&status=`, `POST`, `GET/PUT/PATCH/DELETE /api/appointments/:id` ·
`GET /api/stats` · `GET /health`.

Example: `POST /api/appointments {"patient_id":1,"doctor_id":1,"appointment_date":"2026-10-05","start_time":"10:00","end_time":"10:30"}`
→ `201`; repeating with `10:15–10:45` → `409 {"error":{"status":409,"message":"Doctor already has an appointment from 10:00 to 10:30 on this date"}}`.

Not included: password reset, rate limiting and deployment.
