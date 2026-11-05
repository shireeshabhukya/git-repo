import { Router } from 'express';
import { query } from './db.js';
import { clean, apptFields } from './validate.js';
import { ApiError, badRequest, notFound, wrap } from './errors.js';

const r = Router();
const SELECT = `SELECT a.id, a.patient_id, a.doctor_id, to_char(a.appointment_date,'YYYY-MM-DD') AS appointment_date,
  to_char(a.start_time,'HH24:MI') AS start_time, to_char(a.end_time,'HH24:MI') AS end_time, a.status, a.reason,
  p.name AS patient_name, d.name AS doctor_name, d.specialty
  FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN doctors d ON d.id=a.doctor_id`;

async function assertValid(a, ignoreId = null) {
  if (a.start_time >= a.end_time) throw badRequest({ end_time: 'must be later than start time' });
  if (!(await query('SELECT 1 FROM patients WHERE id=$1', [a.patient_id])).rowCount) throw notFound('Patient');
  if (!(await query('SELECT 1 FROM doctors WHERE id=$1', [a.doctor_id])).rowCount) throw notFound('Doctor');
  if (a.status === 'cancelled') return;
  // Overlap: existing.start < new.end AND existing.end > new.start (back-to-back slots are allowed)
  const { rows } = await query(
    `SELECT id, to_char(start_time,'HH24:MI') s, to_char(end_time,'HH24:MI') e FROM appointments
     WHERE doctor_id=$1 AND appointment_date=$2 AND status<>'cancelled' AND start_time<$4 AND end_time>$3 AND id<>COALESCE($5,-1)`,
    [a.doctor_id, a.appointment_date, a.start_time, a.end_time, ignoreId]);
  if (rows[0]) throw new ApiError(409, `Doctor already has an appointment from ${rows[0].s} to ${rows[0].e} on this date`, { conflicting_appointment_id: rows[0].id });
}

r.get('/', wrap(async (req, res) => {
  const cond = [], p = [];
  for (const [k, col] of [['date', 'a.appointment_date'], ['doctor_id', 'a.doctor_id'], ['patient_id', 'a.patient_id'], ['status', 'a.status']])
    if (req.query[k]) { p.push(req.query[k]); cond.push(`${col}=$${p.length}`); }
  const { rows } = await query(`${SELECT} ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''} ORDER BY a.appointment_date, a.start_time`, p);
  res.json(rows);
}));
r.get('/:id', wrap(async (req, res) => {
  const { rows } = await query(`${SELECT} WHERE a.id=$1`, [req.params.id]);
  if (!rows[0]) throw notFound('Appointment');
  res.json(rows[0]);
}));
r.post('/', wrap(async (req, res) => {
  const a = clean(req.body, { fields: apptFields });
  a.status ??= 'scheduled';
  await assertValid(a);
  const { rows } = await query(
    `INSERT INTO appointments (patient_id,doctor_id,appointment_date,start_time,end_time,status,reason) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [a.patient_id, a.doctor_id, a.appointment_date, a.start_time, a.end_time, a.status, a.reason ?? null]);
  res.status(201).json((await query(`${SELECT} WHERE a.id=$1`, [rows[0].id])).rows[0]);
}));
const update = wrap(async (req, res) => {
  const cur = (await query(`${SELECT} WHERE a.id=$1`, [req.params.id])).rows[0];
  if (!cur) throw notFound('Appointment');
  const a = { ...cur, ...clean(req.body, { fields: apptFields, partial: true }) };
  await assertValid(a, cur.id);
  await query(`UPDATE appointments SET patient_id=$1,doctor_id=$2,appointment_date=$3,start_time=$4,end_time=$5,status=$6,reason=$7 WHERE id=$8`,
    [a.patient_id, a.doctor_id, a.appointment_date, a.start_time, a.end_time, a.status, a.reason, cur.id]);
  res.json((await query(`${SELECT} WHERE a.id=$1`, [cur.id])).rows[0]);
});
r.put('/:id', update); r.patch('/:id', update);
// DELETE = hard delete. To keep history, PATCH status to "cancelled" instead (frees the slot).
r.delete('/:id', wrap(async (req, res) => {
  if (!(await query('DELETE FROM appointments WHERE id=$1', [req.params.id])).rowCount) throw notFound('Appointment');
  res.status(204).end();
}));
export default r;
