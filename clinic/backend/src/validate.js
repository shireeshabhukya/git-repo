import { badRequest } from './errors.js';
const PHONE = /^[+]?[0-9\s\-()]{7,20}$/, EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, DATE = /^\d{4}-\d{2}-\d{2}$/, TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const s = (v) => (typeof v === 'string' ? v.trim() : v);

export function clean(body, { partial = false, fields }) {
  const out = {}, errors = {};
  for (const [key, rule] of Object.entries(fields)) {
    let v = s(body[key]);
    if (v === undefined || v === '' || v === null) {
      if (rule.required && !partial) errors[key] = 'is required';
      else if (body[key] !== undefined) out[key] = null;
      continue;
    }
    if (rule.test && !rule.test(v)) errors[key] = rule.msg;
    else out[key] = v;
  }
  if (Object.keys(errors).length) throw badRequest(errors);
  return out;
}
const len = (n) => (v) => String(v).length <= n;
export const patientFields = {
  name: { required: true, test: len(120), msg: 'must be at most 120 characters' },
  date_of_birth: { required: true, test: (v) => DATE.test(v) && new Date(v) < new Date(), msg: 'must be a past date (YYYY-MM-DD)' },
  gender: { required: true, test: (v) => ['male', 'female', 'other'].includes(v), msg: 'must be male, female or other' },
  phone: { required: true, test: (v) => PHONE.test(v), msg: 'must be a valid phone number' },
  email: { test: (v) => EMAIL.test(v), msg: 'must be a valid email' },
  address: {},
};
export const doctorFields = {
  name: { required: true, test: len(120), msg: 'must be at most 120 characters' },
  specialty: { required: true, test: len(80), msg: 'must be at most 80 characters' },
  phone: { required: true, test: (v) => PHONE.test(v), msg: 'must be a valid phone number' },
  email: { test: (v) => EMAIL.test(v), msg: 'must be a valid email' },
};
export const apptFields = {
  patient_id: { required: true, test: (v) => Number.isInteger(+v) && +v > 0, msg: 'must be a valid id' },
  doctor_id: { required: true, test: (v) => Number.isInteger(+v) && +v > 0, msg: 'must be a valid id' },
  appointment_date: { required: true, test: (v) => DATE.test(v) && !isNaN(new Date(v)), msg: 'must be YYYY-MM-DD' },
  start_time: { required: true, test: (v) => TIME.test(v), msg: 'must be HH:MM' },
  end_time: { required: true, test: (v) => TIME.test(v), msg: 'must be HH:MM' },
  status: { test: (v) => ['scheduled', 'completed', 'cancelled'].includes(v), msg: 'must be scheduled, completed or cancelled' },
  reason: {},
};
