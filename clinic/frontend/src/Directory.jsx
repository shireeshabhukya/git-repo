import { useEffect, useState, useCallback } from 'react';
import { api } from './api';
import { Modal, Form, rules, useToast } from './ui';

const CONFIG = {
  patients: { title: 'Patients', one: 'patient', cols: [['name', 'Name'], ['phone', 'Phone'], ['gender', 'Gender'], ['date_of_birth', 'Date of birth']],
    fields: [
      { name: 'name', label: 'Full name', required: true },
      { name: 'date_of_birth', label: 'Date of birth', type: 'date', required: true, validate: rules.past },
      { name: 'gender', label: 'Gender', type: 'select', required: true, options: ['male', 'female', 'other'].map((g) => ({ value: g, label: g })) },
      { name: 'phone', label: 'Phone', required: true, validate: rules.phone },
      { name: 'email', label: 'Email', type: 'email', validate: rules.email },
      { name: 'address', label: 'Address', type: 'textarea' }] },
  doctors: { title: 'Doctors', one: 'doctor', cols: [['name', 'Name'], ['specialty', 'Specialty'], ['phone', 'Phone'], ['email', 'Email']],
    fields: [
      { name: 'name', label: 'Full name', required: true },
      { name: 'specialty', label: 'Specialty', required: true },
      { name: 'phone', label: 'Phone', required: true, validate: rules.phone },
      { name: 'email', label: 'Email', type: 'email', validate: rules.email }] },
};
const fmt = (k, v) => (k === 'date_of_birth' && v ? String(v).slice(0, 10) : v || '—');

export default function Directory({ resource, canEdit }) {
  const cfg = CONFIG[resource], toast = useToast();
  const [rows, setRows] = useState([]), [q, setQ] = useState(''), [modal, setModal] = useState(null), [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); api.list(resource, { search: q }).then(setRows).catch((e) => toast(e.message, 'err')).finally(() => setLoading(false)); }, [resource, q, toast]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const save = async (v) => {
    modal.row ? await api.update(resource, modal.row.id, v) : await api.create(resource, v);
    toast(`${cfg.one[0].toUpperCase() + cfg.one.slice(1)} saved`); setModal(null); load();
  };
  const del = async (r) => {
    if (!confirm(`Delete ${r.name}?`)) return;
    try { await api.remove(resource, r.id); toast(`${r.name} deleted`); load(); } catch (e) { toast(e.message, 'err'); }
  };
  return <section>
    <div className="bar"><h1>{cfg.title}</h1><input className="search" type="search" placeholder={`Search ${cfg.title.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} />
      {canEdit && <button className="primary" onClick={() => setModal({})}><i className="fa-solid fa-plus" /> Add {cfg.one}</button>}</div>
    {loading ? <p className="muted">Loading…</p> : !rows.length ? <p className="empty">{q ? 'No matches. Try a different search.' : `No ${cfg.title.toLowerCase()} yet. Add the first ${cfg.one} to get started.`}</p> :
      <div className="tablewrap"><table><thead><tr>{cfg.cols.map(([, l]) => <th key={l}>{l}</th>)}<th /></tr></thead><tbody>
        {rows.map((r) => <tr key={r.id}>{cfg.cols.map(([k, l]) => <td key={k} data-label={l}>{fmt(k, r[k])}</td>)}
          <td className="rowactions"><button className="ghost" onClick={() => setModal({ row: r, view: true })}>View</button>{canEdit && <><button className="ghost" onClick={() => setModal({ row: r })}>Edit</button><button className="ghost danger" onClick={() => del(r)}>Delete</button></>}</td></tr>)}
      </tbody></table></div>}
    {modal && (modal.view
      ? <Modal title={modal.row.name} onClose={() => setModal(null)}><dl>{cfg.fields.map((f) => <div key={f.name}><dt>{f.label}</dt><dd>{fmt(f.name, modal.row[f.name])}</dd></div>)}</dl></Modal>
      : <Modal title={modal.row ? `Edit ${cfg.one}` : `Add ${cfg.one}`} onClose={() => setModal(null)}>
        <Form fields={cfg.fields} initial={modal.row && { ...modal.row, date_of_birth: modal.row.date_of_birth?.slice(0, 10) }} onSubmit={save} /></Modal>)}
  </section>;
}
