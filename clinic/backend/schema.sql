CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('male','female','other')),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(120),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  specialty VARCHAR(80) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(120) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id INT NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_time_order CHECK (start_time < end_time),
  -- Race-safe guarantee: no two active appointments of one doctor may overlap.
  CONSTRAINT no_doctor_overlap EXCLUDE USING gist (
    doctor_id WITH =,
    tsrange(appointment_date + start_time, appointment_date + end_time) WITH &&
  ) WHERE (status <> 'cancelled')
);

CREATE INDEX IF NOT EXISTS idx_appt_date ON appointments (appointment_date);
CREATE INDEX IF NOT EXISTS idx_appt_doctor_date_time ON appointments (doctor_id, appointment_date, start_time, end_time);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(20),
  address TEXT,
  password_hash TEXT NOT NULL,
  role VARCHAR(12) NOT NULL DEFAULT 'receptionist',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Upgrade older versions of the users table (safe to run many times)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(12);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users SET role='receptionist' WHERE role='staff';
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','receptionist','doctor'));
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'receptionist';
