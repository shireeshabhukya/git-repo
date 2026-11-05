const FEATURES = [
  ['fa-user-doctor', '#0d6efd', 'Patient & Doctor Records', 'Store patients and doctors with validated contact details and specialties'],
  ['fa-calendar-check', '#198754', 'Conflict-Free Booking', 'A doctor can never be double-booked, even when two people book at once'],
  ['fa-chart-pie', '#ffc107', 'Date-wise Insights', 'Search appointments by date and see today’s schedule at a glance'],
];
const li = (t, info) => <li key={t}><i className={`fa-solid ${info ? 'fa-circle-info info' : 'fa-circle-check'}`} /> {t}</li>;
const item = ([icon, t]) => <li key={t}><i className={`fa-solid ${icon}`} /> {t}</li>;
const PATIENT = [['fa-user', 'Full name'], ['fa-cake-candles', 'Date of birth'], ['fa-venus-mars', 'Gender'], ['fa-phone', 'Phone number'], ['fa-envelope', 'Email address'], ['fa-location-dot', 'Address']];
const APPT = [['fa-user-doctor', 'Doctor'], ['fa-stethoscope', 'Specialty'], ['fa-calendar-day', 'Appointment date'], ['fa-clock', 'Start time'], ['fa-hourglass-end', 'End time'], ['fa-circle-check', 'Status (scheduled / completed / cancelled)'], ['fa-notes-medical', 'Reason for visit']];

export default function Home({ go }) {
  return <>
    <div className="hero"><i className="fa-solid fa-hospital big" /><h1><i className="fa-solid fa-stethoscope" /> Clinic Appointment Management System</h1><p>Smart scheduling for patients, doctors and appointments</p></div>
    <div className="cols">{FEATURES.map(([ic, c, t, d]) => <div key={t} className="card feature"><i className={`fa-solid ${ic}`} style={{ color: c }} /><h3>{t}</h3><p>{d}</p></div>)}</div>
    <div className="cols2">
      <div className="card"><div className="cardhead"><i className="fa-solid fa-user-shield" /> Admin & Receptionist Access</div><div className="cardbody"><ul className="checks">
        {['Manage patient records', 'Book, reschedule and cancel appointments', 'Search appointments by date', 'Admins also manage doctor records'].map((t) => li(t))}</ul>
        <button className="primary" onClick={() => go('login')}><i className="fa-solid fa-right-to-bracket" /> Staff Login</button></div></div>
      <div className="card"><div className="cardhead"><i className="fa-solid fa-user-doctor" /> Doctor Access</div><div className="cardbody"><ul className="checks">
        {['View the appointment schedule', 'View patient details', 'Easy-to-use interface'].map((t) => li(t))}{li('View-only access', true)}</ul>
        <button className="primary outline" onClick={() => go('login')}><i className="fa-solid fa-right-to-bracket" /> Doctor Login</button></div></div>
    </div>
    <div className="card"><div className="cardhead"><i className="fa-solid fa-circle-info" /> About the System</div><div className="cardbody">
      <div className="cols2 flat"><div><h3>Patient information:</h3><ul className="plain">{PATIENT.map(item)}</ul></div><div><h3>Appointment information:</h3><ul className="plain">{APPT.map(item)}</ul></div></div></div></div>
  </>;
}
