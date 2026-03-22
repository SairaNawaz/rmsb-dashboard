const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  user:     process.env.DB_USER     || 'admin',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME     || 'rmsb_db',
});

// Prevent pool errors (e.g. postgres restart) from crashing the process
pool.on('error', (err) => {
  console.error('DB pool error:', err.message);
});

module.exports = pool;
