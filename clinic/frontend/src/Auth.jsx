import { api, auth } from './api';
import { Form, rules, useToast } from './ui';

export default function Auth({ mode, setView, onLogin }) {
  const reg = mode === 'register';
  const toast = useToast();
  const fields = reg ? [
    { name: 'name', label: 'Full Name', icon: 'fa-user', required: true },
    { name: 'phone', label: 'Mobile Number', icon: 'fa-phone', required: true, validate: rules.phone },
    { name: 'email', label: 'Email Address', icon: 'fa-envelope', type: 'email', required: true, validate: rules.email, wide: true },
    { name: 'address', label: 'Address', icon: 'fa-location-dot', type: 'textarea', wide: true },
    { name: 'role', label: 'User Type', icon: 'fa-user-tag', type: 'select', required: true, wide: true, options: [{ value: 'receptionist', label: 'Receptionist' }, { value: 'doctor', label: 'Doctor' }] },
    { name: 'password', label: 'Password', icon: 'fa-lock', type: 'password', required: true, validate: (v) => (v.length < 8 ? 'At least 8 characters' : '') },
    { name: 'confirm', label: 'Confirm Password', icon: 'fa-lock', type: 'password', required: true, validate: (v, all) => (v !== all.password ? 'Passwords do not match' : '') },
  ] : [
    { name: 'email', label: 'Email Address', icon: 'fa-envelope', type: 'email', required: true, wide: true },
    { name: 'password', label: 'Password', icon: 'fa-lock', type: 'password', required: true, wide: true },
  ];
  const submit = async (v) => {
  if (reg) {
    await api.register({ name: v.name, phone: v.phone, email: v.email, address: v.address, role: v.role, password: v.password });
    toast('Registration successful. Please log in.');
    setView('login');
    return;
  }
  const { token, user } = await api.login({ email: v.email, password: v.password });
  auth.set(token); onLogin(user);
};
  return <div className={`card authcard ${reg ? 'wide' : ''}`}>
    <div className="cardhead center"><h2><i className={`fa-solid ${reg ? 'fa-user-plus' : 'fa-right-to-bracket'}`} /> {reg ? 'User Registration' : 'User Login'}</h2></div>
    <div className="cardbody">
      <Form key={mode} fields={fields} onSubmit={submit} submitLabel={<><i className={`fa-solid ${reg ? 'fa-user-plus' : 'fa-right-to-bracket'}`} /> {reg ? 'Register' : 'Login'}</>} />
      {reg && <p className="hint">The very first account created in a new system becomes the Administrator.</p>}
      <p className="switch">{reg ? 'Already have an account?' : "Don't have an account?"} <a href="#" onClick={(e) => { e.preventDefault(); setView(reg ? 'login' : 'register'); }}>{reg ? 'Login here' : 'Register here'}</a></p>
    </div>
  </div>;
}
