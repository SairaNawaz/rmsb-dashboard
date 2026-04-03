const express = require('express');
const router = express.Router();
const pool = require('../db');

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /registry — list all services
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM services ORDER BY registered_at ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /registry/next-id — preview the next auto-assigned service ID
router.get('/next-id', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(MAX(CAST(substring(name FROM 2) AS int)), 0) + 1 AS next
       FROM services WHERE name ~ '^s[0-9]+$'`
    );
    res.json({ name: `s${rows[0].next}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /registry/:name/env — return raw env file content for a service (used by Jenkins at deploy time)
router.get('/:name/env', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT env_vars FROM services WHERE name = $1 AND status = 'active'`,
      [req.params.name]
    );
    if (!rows.length) return res.status(404).json({ error: 'Service not found or not active' });
    res.type('text/plain').send(rows[0].env_vars || '');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /registry — register a new service
router.post('/', async (req, res) => {
  const { display_name, description, icon, repo_url, branch, env_vars } = req.body;

  try {
    const { rows: counter } = await pool.query(
      `SELECT COALESCE(MAX(CAST(substring(name FROM 2) AS int)), 0) + 1 AS next
       FROM services WHERE name ~ '^s[0-9]+$'`
    );
    const name           = `s${counter[0].next}`;
    const path_prefix    = `/${name}`;
    const container_name = `rmsb-${name}`;
    const schema_name    = `schema_${name}`;

    const { rows } = await pool.query(
      `INSERT INTO services
         (name, display_name, description, icon, path_prefix,
          container_name, schema_name, repo_url, branch, env_vars)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        name, display_name, description || null, icon || '🔧', path_prefix,
        container_name, schema_name, repo_url || null, branch || 'main', env_vars || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /registry/:id — update service status
router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE services SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Service not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /registry/:id — remove service from registry
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM services WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Service not found' });

    await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
