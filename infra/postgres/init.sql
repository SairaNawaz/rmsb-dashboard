-- ─────────────────────────────────────────────────────────
-- RMSB Platform — shared PostgreSQL init
-- Runs once on first container start (empty data volume).
-- Add new service schemas here as the platform grows.
-- ─────────────────────────────────────────────────────────

-- ── S1: Device Management ────────────────────────────────
CREATE SCHEMA IF NOT EXISTS schema_s1;

CREATE TABLE IF NOT EXISTS schema_s1.devices (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(100) NOT NULL,
  assigned_to VARCHAR(255),
  status      VARCHAR(50)  NOT NULL DEFAULT 'available',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed data
INSERT INTO schema_s1.devices (name, type, assigned_to, status) VALUES
  ('Laptop-001',   'Laptop',  'Alice', 'active'),
  ('Phone-042',    'Mobile',  'Bob',   'active'),
  ('Monitor-007',  'Monitor', NULL,    'available');

-- ── S2: Capacity Planning ────────────────────────────────
CREATE SCHEMA IF NOT EXISTS schema_s2;

CREATE TABLE IF NOT EXISTS schema_s2.capacity_entries (
  id         SERIAL PRIMARY KEY,
  employee   VARCHAR(255) NOT NULL,
  leave_type VARCHAR(100) NOT NULL,
  start_date DATE         NOT NULL,
  end_date   DATE         NOT NULL,
  status     VARCHAR(50)  NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed data
INSERT INTO schema_s2.capacity_entries (employee, leave_type, start_date, end_date, status) VALUES
  ('Alice', 'Annual', '2026-04-01', '2026-04-05', 'approved'),
  ('Bob',   'Sick',   '2026-03-20', '2026-03-21', 'pending'),
  ('Carol', 'Annual', '2026-05-10', '2026-05-14', 'approved');

-- ── Add future schemas below (e.g. schema_s3, schema_s4) ──
