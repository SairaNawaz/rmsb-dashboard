const pool = require('../db');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id             SERIAL PRIMARY KEY,
      name           VARCHAR(50)  UNIQUE NOT NULL,
      display_name   VARCHAR(100) NOT NULL,
      description    TEXT,
      icon           VARCHAR(50)  DEFAULT '🔧',
      path_prefix    VARCHAR(20)  UNIQUE NOT NULL,
      container_name VARCHAR(100) NOT NULL,
      schema_name    VARCHAR(100) NOT NULL,
      status         VARCHAR(20)  DEFAULT 'pending',
      repo_url       TEXT,
      branch         VARCHAR(100) DEFAULT 'main',
      ghcr_image     TEXT,
      image_tag      VARCHAR(50)  DEFAULT 'latest',
      registered_at  TIMESTAMP    DEFAULT NOW(),
      updated_at     TIMESTAMP    DEFAULT NOW()
    )
  `);

  // Drop legacy port column if it exists from older schema
  await pool.query(`
    ALTER TABLE services DROP COLUMN IF EXISTS port
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_users (
      id           SERIAL PRIMARY KEY,
      email        VARCHAR(255) UNIQUE NOT NULL,
      display_name VARCHAR(100),
      role         VARCHAR(20)  DEFAULT 'Viewer',
      added_by     VARCHAR(255),
      created_at   TIMESTAMP    DEFAULT NOW()
    )
  `);

  console.log('Migration complete: services + platform_users tables ready');
}

module.exports = migrate;
