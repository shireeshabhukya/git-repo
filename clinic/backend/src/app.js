import express from 'express';
import cors from 'cors';
import { query } from './db.js';
import { crudRouter } from './crud.js';
import appointments from './appointments.js';
import auth, { requireAuth, canWrite } from './auth.js';
import { patientFields, doctorFields } from './validate.js';
import { errorHandler, wrap, ApiError } from './errors.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '100kb' }));
app.get('/health', wrap(async (_q, res) => { await query('SELECT 1'); res.json({ status: 'ok' }); }));
app.use('/api/auth', auth);
app.use('/api', requireAuth); // everything below needs a login
app.get('/api/stats', wrap(async (_q, res) => {
  const { rows } = await query(`SELECT (SELECT count(*) FROM patients)::int patients, (SELECT count(*) FROM doctors)::int doctors,
    (SELECT count(*) FROM appointments WHERE status='scheduled' AND (appointment_date + start_time) >= now())::int upcoming,
    (SELECT count(*) FROM appointments WHERE appointment_date=current_date AND status<>'cancelled')::int today`);
  res.json(rows[0]);
}));
// Roles: admin = everything, receptionist = patients + appointments, doctor = read-only
app.use('/api/patients', canWrite('admin', 'receptionist'), crudRouter({ table: 'patients', label: 'Patient', fields: patientFields, searchCols: ['name', 'phone', 'email'] }));
app.use('/api/doctors', canWrite('admin'), crudRouter({ table: 'doctors', label: 'Doctor', fields: doctorFields, searchCols: ['name', 'specialty', 'email'] }));
app.use('/api/appointments', canWrite('admin', 'receptionist'), appointments);
app.use((_q, _r, next) => next(new ApiError(404, 'Route not found')));
app.use(errorHandler);
export default app;
