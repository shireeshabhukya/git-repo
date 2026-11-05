import { useEffect, useState, useCallback } from 'react';
import { api } from './api';
import { Modal, Form, useToast } from './ui';

const today = () => new Date().toLocaleDateString('en-CA');

export function BookingForm({ initial, onDone }) {
  const [opts, setOpts] = useState(null), toast = useToast();
  useEffect(() => { Promise.all([api.list('patients'), api.list('doctors')]).then(([p, d]) => setOpts({ p, d })); }, []);
  if (!opts) return <p className="muted">Loading…</p>;
  if (!opts.p.length || !opts.d.length) return <p className="empty">Add at least one patient and one doctor before booking.</p>;
  const fields = [
    { name: 'patient_id', label: 'Patient', type: 'select', required: true, options: opts.p.map((x) => ({ value: x.id, label: x.name })) },
    { name: 'doctor_id', label: 'Doctor', type: 'select', required: true, options: opts.d.map((x) => ({ value: x.id, label: `${x.name} (${x.specialty})` })) },
    { name: 'appointment_date', label: 'Date', type: 'date', required: true, validate: (v) => (v < today() && !initial ? 'Pick today or a future date' : '') },
    { name: 'start_time', label: 'Start', type: 'time', required: true },
    { name: 'end_time', label: 'End', type: 'time', required: true, validate: (v, all) => (all.start_time && v <= all.start_time ? 'Must be after start time' : '') },
    ...(initial ? [{ name: 'status', label: 'Status', type: 'select', options: ['scheduled', 'completed', 'cancelled'].map((s) => ({ value: s, label: s })) }] : []),
    { name: 'reason', label: 'Reason / notes', type: 'textarea' }];
  return <Form fields={fields} initial={initial} submitLabel={initial ? 'Save changes' : 'Book appointment'}
    onSubmit={async (v) => { initial ? await api.update('appointments', initial.id, v) : await api.create('appointments', v); toast(initial ? 'Appointment updated' : 'Appointment booked'); onDone(); }} />;
}

export default function Appointments({ openBooking, canEdit }) {
  const toast = useToast();
  const [rows, setRows] = useState([]), [date, setDate] = useState(''), [status, setStatus] = useState(''), [edit, setEdit] = useState(null);
  const load = useCallback(() => api.list('appointments', { date, status }).then(setRows).catch((e) => toast(e.message, 'err')), [date, status, toast]);
  useEffect(() => { load(); }, [load]);
  const cancel = async (a) => { await api.patch('appointments', a.id, { status: 'cancelled' }); toast('Appointment cancelled'); load(); };
  const del = async (a) => { if (confirm('Permanently delete this appointment?')) { await api.remove('appointments', a.id); toast('Appointment deleted'); load(); } };
  return <section>
    <div className="bar"><h1>Appointments</h1>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Filter by date" />
      <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{['scheduled', 'completed', 'cancelled'].map((s) => <option key={s}>{s}</option>)}</select>
      {(date || status) && <button className="ghost" onClick={() => { setDate(''); setStatus(''); }}>Clear</button>}
      {canEdit && <button className="primary" onClick={openBooking}><i className="fa-solid fa-calendar-plus" /> Book appointment</button>}</div>
    {!rows.length ? <p className="empty">{date ? `No appointments on ${date}.` : 'No appointments yet.'}</p> :
      <div className="tablewrap"><table><thead><tr>{['Date', 'Time', 'Patient', 'Doctor', 'Status', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>
        {rows.map((a) => <tr key={a.id} className={a.status === 'cancelled' ? 'dim' : ''}>
          <td data-label="Date">{a.appointment_date}</td><td data-label="Time">{a.start_time}–{a.end_time}</td><td data-label="Patient">{a.patient_name}</td>
          <td data-label="Doctor">{a.doctor_name}<small>{a.specialty}</small></td><td data-label="Status"><span className={`pill ${a.status}`}>{a.status}</span></td>
          <td className="rowactions">{canEdit && <><button className="ghost" onClick={() => setEdit(a)}>Reschedule</button>
            {a.status === 'scheduled' && <button className="ghost" onClick={() => cancel(a)}>Cancel</button>}<button className="ghost danger" onClick={() => del(a)}>Delete</button></>}</td></tr>)}
      </tbody></table></div>}
    {edit && <Modal title="Edit appointment" onClose={() => setEdit(null)}><BookingForm initial={edit} onDone={() => { setEdit(null); load(); }} /></Modal>}
  </section>;
}
