const express = require('express');
const router = express.Router();
const pool = require('../db');

const SUPER_ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// GET /users — list all users
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM platform_users ORDER BY created_at ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /users/resolve — resolve role for a Microsoft login
// Called by frontend on every Microsoft login to get the correct role
router.post('/resolve', async (req, res) => {
  const { email, display_name } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const normalised = email.toLowerCase();

  // SuperAdmin — seeded from env, always wins
  if (SUPER_ADMIN_EMAILS.includes(normalised)) {
    return res.json({ role: 'SuperAdmin' });
  }

  try {
    // Check platform_users table
    const { rows } = await pool.query(
      'SELECT role FROM platform_users WHERE LOWER(email) = $1',
      [normalised]
    );

    if (rows.length > 0) {
      return res.json({ role: rows[0].role });
    }

    // Not found — insert as Viewer and return Viewer
    await pool.query(
      `INSERT INTO platform_users (email, display_name, role)
       VALUES ($1, $2, 'Viewer')
       ON CONFLICT (email) DO NOTHING`,
      [email, display_name || email]
    );

    res.json({ role: 'Viewer' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /users — add a user with a specific role (SuperAdmin only)
router.post('/', async (req, res) => {
  const { email, display_name, role, added_by } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO platform_users (email, display_name, role, added_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET role = $3, added_by = $4
       RETURNING *`,
      [email, display_name || email, role || 'Viewer', added_by || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /users/:id — update role
router.patch('/:id', async (req, res) => {
  const { role } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE platform_users SET role = $1 WHERE id = $2 RETURNING *',
      [role, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /users/:id — remove user (reverts to Viewer on next login)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM platform_users WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;