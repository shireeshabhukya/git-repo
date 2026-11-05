import { useState, useEffect } from 'react';
import { api, auth, setOnExpire } from './api';
import { ToastProvider, Modal } from './ui';
import Directory from './Directory';
import Appointments, { BookingForm } from './Appointments';
import Auth from './Auth';
import Home from './Home';

const Brand = () => <div className="brand"><i className="fa-solid fa-hospital" /> Clinic Appointment System</div>;
const Footer = () => <footer className="foot">© 2026 Clinic Appointment Management System. All rights reserved.</footer>;

function Dashboard({ user, go, book, canBook }) {
  const [s, setS] = useState(null), [today, setToday] = useState([]);
  useEffect(() => { api.stats().then(setS).catch(() => {}); api.list('appointments', { date: new Date().toLocaleDateString('en-CA') }).then(setToday).catch(() => {}); }, []);
  const stat = (n, label, icon, to) => <button className="card stat" onClick={() => go(to)}><i className={`fa-solid ${icon}`} /><b>{s ? n : '–'}</b><span>{label}</span></button>;
  return <section>
    <div className="hero small"><h1>Welcome, {user.name}</h1><p>Here is today’s overview</p>{canBook && <button className="primary" onClick={book}><i className="fa-solid fa-calendar-plus" /> Book appointment</button>}</div>
    <div className="stats">{stat(s?.today, 'appointments today', 'fa-calendar-day', 'appointments')}{stat(s?.upcoming, 'upcoming', 'fa-clock', 'appointments')}{stat(s?.patients, 'patients', 'fa-users', 'patients')}{stat(s?.doctors, 'doctors', 'fa-user-doctor', 'doctors')}</div>
    <h3>Today’s schedule</h3>
    {!today.length ? <p className="empty">Nothing booked for today.</p> : <ul className="agenda card">{today.map((a) => <li key={a.id} className={a.status === 'cancelled' ? 'dim' : ''}><time>{a.start_time}</time><div><b>{a.patient_name}</b><small>with {a.doctor_name} · {a.status}</small></div></li>)}</ul>}
  </section>;
}

const NAV = [['dashboard', 'Dashboard', 'fa-gauge'], ['appointments', 'Appointments', 'fa-calendar-days'], ['patients', 'Patients', 'fa-users'], ['doctors', 'Doctors', 'fa-user-doctor']];
function Shell({ user, logout }) {
  const [page, setPage] = useState('dashboard'), [booking, setBooking] = useState(false), [tick, setTick] = useState(0);
  const staff = user.role !== 'doctor', admin = user.role === 'admin';
  return <div className="page">
    <header className="nav"><Brand />
      <nav>{NAV.map(([k, l, ic]) => <button key={k} className={page === k ? 'on' : ''} onClick={() => setPage(k)}><i className={`fa-solid ${ic}`} /> {l}</button>)}</nav>
      <div className="navr"><span className="who"><i className="fa-solid fa-circle-user" /> {user.name} <em>{user.role}</em></span><button onClick={logout}><i className="fa-solid fa-right-from-bracket" /> Logout</button></div></header>
    <main className="wrap" key={tick + page}>
      {page === 'dashboard' && <Dashboard user={user} go={setPage} canBook={staff} book={() => setBooking(true)} />}
      {page === 'appointments' && <Appointments canEdit={staff} openBooking={() => setBooking(true)} />}
      {page === 'patients' && <Directory resource="patients" canEdit={staff} />}
      {page === 'doctors' && <Directory resource="doctors" canEdit={admin} />}
    </main><Footer />
    {booking && <Modal title="Book appointment" onClose={() => setBooking(false)}><BookingForm onDone={() => { setBooking(false); setTick((t) => t + 1); }} /></Modal>}
  </div>;
}

export default function App() {
  const [user, setUser] = useState(null), [ready, setReady] = useState(!auth.get()), [view, setView] = useState('home');
  useEffect(() => {
    setOnExpire(() => { setUser(null); setView('login'); });
    if (auth.get()) api.me().then(setUser).catch(() => auth.clear()).finally(() => setReady(true));
  }, []);
  const logout = () => { auth.clear(); setUser(null); setView('home'); };
  if (!ready) return <p className="muted" style={{ margin: '2rem' }}>Loading…</p>;
  return <ToastProvider>{user ? <Shell user={user} logout={logout} /> : <div className="page">
    <header className="nav"><Brand /><div className="navr"><button onClick={() => setView('login')}><i className="fa-solid fa-right-to-bracket" /> Login</button><button onClick={() => setView('register')}><i className="fa-solid fa-user-plus" /> Register</button></div></header>
    <main className="wrap">{view === 'home' ? <Home go={setView} /> : <Auth mode={view} setView={setView} onLogin={(u) => { setUser(u); setView('home'); }} />}</main><Footer />
  </div>}</ToastProvider>;
}
