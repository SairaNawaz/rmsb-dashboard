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

// GET /registry/:name/env — return merged env file content for a service
// Called by Jenkins at deploy time to write services/.env.<name>
router.get('/:name/env', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT env_vars, db_user, db_password FROM services WHERE name = $1 AND status = 'active'`,
      [req.params.name]
    );
    if (!rows.length) return res.status(404).json({ error: 'Service not found or not active' });

    const { env_vars, db_user, db_password } = rows[0];

    const lines = [
      `DB_HOST=${process.env.DB_HOST || 'postgres'}`,
      `DB_PORT=${process.env.DB_PORT || '5432'}`,
      `DB_NAME=${process.env.DB_NAME || ''}`,
      `DB_USER=${db_user || ''}`,
      `DB_PASSWORD=${db_password || ''}`,
      ...(env_vars ? [env_vars] : []),
    ];

    res.type('text/plain').send(lines.join('\n'));
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
    const base_url       = `http://${name}:3000`;

    const { rows } = await pool.query(
      `INSERT INTO services
         (name, display_name, description, icon, path_prefix,
          container_name, schema_name, repo_url, branch, env_vars, base_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        name, display_name, description || null, icon || '🔧', path_prefix,
        container_name, schema_name, repo_url || null, branch || 'main',
        env_vars || null, base_url,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /registry/:id — update service status or base_url
router.patch('/:id', async (req, res) => {
  const { status, base_url } = req.body;
  try {
    if (base_url !== undefined) {
      // Admin updating the base_url (e.g. moving service to external hosting)
      const { rows } = await pool.query(
        `UPDATE services SET base_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [base_url, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Service not found' });
      return res.json(rows[0]);
    }

    const { rows } = await pool.query(
      `UPDATE services SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Service not found' });
    res.json(rows[0]);

    if (status === 'active') {
      console.log(`Service ${rows[0].name} activated — DB is managed externally (separate Neon project)`);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /registry/:id — remove service and clean up DB schema/user
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM services WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Service not found' });
    const svc = rows[0];

    await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
    console.log(`Service ${svc.name} removed — DB cleanup is managed externally`);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
