const BASE = import.meta.env.VITE_API_URL || '';
const KEY = 'clinic_token';
export const auth = { get: () => localStorage.getItem(KEY), set: (t) => localStorage.setItem(KEY, t), clear: () => localStorage.removeItem(KEY) };
let onExpire = () => {};
export const setOnExpire = (f) => { onExpire = f; };
export class ApiError extends Error { constructor(m, status, details) { super(m); this.status = status; this.details = details; } }
async function req(path, opts = {}) {
  const token = auth.get();
  const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
  const res = await fetch(BASE + path, { ...opts, headers, body: opts.body && JSON.stringify(opts.body) });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth/login')) { auth.clear(); onExpire(); }
    throw new ApiError(data.error?.message || 'Request failed', res.status, data.error?.details);
  }
  return data;
}
const qs = (o = {}) => { const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v)); return p.size ? `?${p}` : ''; };
export const api = {
  login: (body) => req('/api/auth/login', { method: 'POST', body }),
  register: (body) => req('/api/auth/register', { method: 'POST', body }),
  me: () => req('/api/auth/me'),
  stats: () => req('/api/stats'),
  list: (r, params) => req(`/api/${r}${qs(params)}`),
  create: (r, body) => req(`/api/${r}`, { method: 'POST', body }),
  update: (r, id, body) => req(`/api/${r}/${id}`, { method: 'PUT', body }),
  patch: (r, id, body) => req(`/api/${r}/${id}`, { method: 'PATCH', body }),
  remove: (r, id) => req(`/api/${r}/${id}`, { method: 'DELETE' }),
};
