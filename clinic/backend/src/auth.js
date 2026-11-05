import 'dotenv/config';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';
import { clean } from './validate.js';
import { ApiError, badRequest, wrap } from './errors.js';

const SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-secret-change-me');
if (!SECRET) { console.error('JWT_SECRET is missing in .env'); process.exit(1); }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, PHONE = /^[+]?[0-9\s\-()]{7,20}$/;
const regFields = {
  name: { required: true, test: (v) => v.length <= 120, msg: 'must be at most 120 characters' },
  phone: { required: true, test: (v) => PHONE.test(v), msg: 'must be a valid phone number' },
  email: { required: true, test: (v) => EMAIL.test(v), msg: 'must be a valid email' },
  address: {},
  role: { required: true, test: (v) => ['receptionist', 'doctor'].includes(v), msg: 'must be receptionist or doctor' },
  password: { required: true, test: (v) => v.length >= 8 && v.length <= 72, msg: 'must be 8 to 72 characters' },
};
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role });
const tokenFor = (u) => jwt.sign({ sub: u.id, role: u.role }, SECRET, { expiresIn: '8h' });

export const requireAuth = (req, _res, next) => {
  const h = req.headers.authorization || '';
  try {
    const p = jwt.verify(h.startsWith('Bearer ') ? h.slice(7) : '', SECRET);
    req.user = { id: p.sub, role: p.role };
    next();
  } catch { next(new ApiError(401, 'Please log in to continue')); }
};
// Read access for every logged-in user; write access only for the listed roles.
export const canWrite = (...roles) => (req, _res, next) =>
  req.method === 'GET' || roles.includes(req.user.role) ? next() : next(new ApiError(403, 'Your account type is not allowed to do this'));

const r = Router();
r.post('/register', wrap(async (req, res) => {
  const d = clean(req.body, { fields: regFields });
  d.email = d.email.toLowerCase();
  if ((await query('SELECT 1 FROM users WHERE email=$1', [d.email])).rowCount)
    throw badRequest({ email: 'An account with this email already exists' });
  const hash = await bcrypt.hash(d.password, 10);
  // The very first account in an empty system becomes the administrator.
  const first = (await query('SELECT count(*)::int n FROM users')).rows[0].n === 0;
  const { rows } = await query('INSERT INTO users (name,email,phone,address,password_hash,role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [d.name, d.email, d.phone, d.address ?? null, hash, first ? 'admin' : d.role]);
  res.status(201).json({ token: tokenFor(rows[0]), user: publicUser(rows[0]) });
}));
r.post('/login', wrap(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase(), password = String(req.body?.password || '').trim();
  if (!email || !password) throw badRequest({ email: !email && 'Required', password: !password && 'Required' });
  const u = (await query('SELECT * FROM users WHERE email=$1', [email])).rows[0];
  if (!u || !(await bcrypt.compare(password, u.password_hash))) throw new ApiError(401, 'Invalid email or password');
  res.json({ token: tokenFor(u), user: publicUser(u) });
}));
r.get('/me', requireAuth, wrap(async (req, res) => {
  const u = (await query('SELECT * FROM users WHERE id=$1', [req.user.id])).rows[0];
  if (!u) throw new ApiError(401, 'Please log in to continue');
  res.json(publicUser(u));
}));
export default r;
