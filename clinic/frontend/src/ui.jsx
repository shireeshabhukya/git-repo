import { useState, useEffect, createContext, useContext, useCallback } from 'react';
const ToastCtx = createContext();
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const show = useCallback((msg, kind = 'ok') => { setT({ msg, kind }); setTimeout(() => setT(null), 4000); }, []);
  return <ToastCtx.Provider value={show}>{children}{t && <div className={`toast ${t.kind}`} role="status">{t.msg}</div>}</ToastCtx.Provider>;
}
export function Modal({ title, onClose, children }) {
  useEffect(() => { const h = (e) => e.key === 'Escape' && onClose(); addEventListener('keydown', h); return () => removeEventListener('keydown', h); }, [onClose]);
  return <div className="overlay" onMouseDown={onClose}><div className="modal" role="dialog" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
    <header><h2>{title}</h2><button className="ghost" onClick={onClose} aria-label="Close">✕</button></header>{children}</div></div>;
}
export function Field({ label, error, icon, wide, children }) {
  return <label className={`field ${error ? 'bad' : ''} ${wide ? 'wide' : ''}`}><span>{icon && <i className={`fa-solid ${icon}`} />} {label}</span>{children}{error && <em>{error}</em>}</label>;
}
// Generic form: fields = [{name,label,type,options,required,validate}]. onSubmit returns a promise; server field errors are mapped back.
export function Form({ fields, initial = {}, onSubmit, submitLabel = 'Save', banner }) {
  const [v, setV] = useState(() => Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? ''])));
  const [err, setErr] = useState({}), [busy, setBusy] = useState(false), [top, setTop] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    fields.forEach((f) => {
      const val = String(v[f.name] ?? '').trim();
      if (f.required && !val) local[f.name] = 'Required';
      else if (val && f.validate) { const m = f.validate(val, v); if (m) local[f.name] = m; }
    });
    setErr(local); setTop('');
    if (Object.keys(local).length) return;
    setBusy(true);
    try { await onSubmit(v); } catch (x) { setErr(x.details || {}); setTop(x.message); } finally { setBusy(false); }
  };
  return <form onSubmit={submit} noValidate>
    {banner}{top && <div className="alert" role="alert">{top}</div>}
    <div className="grid">{fields.map((f) => <Field key={f.name} icon={f.icon} wide={f.wide} label={f.label + (f.required ? ' *' : '')} error={err[f.name]}>
      {f.type === 'select' ? <select value={v[f.name]} onChange={(e) => setV({ ...v, [f.name]: e.target.value })}><option value="">Select…</option>{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        : f.type === 'textarea' ? <textarea rows="3" value={v[f.name]} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} />
        : <input type={f.type || 'text'} value={v[f.name]} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} />}
    </Field>)}</div>
    <div className="actions"><button className="primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button></div>
  </form>;
}
export const rules = {
  phone: (x) => (/^[+]?[0-9\s\-()]{7,20}$/.test(x) ? '' : 'Enter a valid phone number'),
  email: (x) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x) ? '' : 'Enter a valid email'),
  past: (x) => (new Date(x) < new Date() ? '' : 'Must be in the past'),
};
