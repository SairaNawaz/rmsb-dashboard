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
      registered_at  TIMESTAMP    DEFAULT NOW(),
      updated_at     TIMESTAMP    DEFAULT NOW()
    )
  `);

  // Drop legacy columns if they exist from older schema
  await pool.query(`ALTER TABLE services DROP COLUMN IF EXISTS port`);
  await pool.query(`ALTER TABLE services DROP COLUMN IF EXISTS ghcr_image`);
  await pool.query(`ALTER TABLE services DROP COLUMN IF EXISTS image_tag`);

  // Per-service DB credentials (populated on activation)
  await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS db_user     VARCHAR(100)`);
  await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS db_password VARCHAR(255)`);

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
