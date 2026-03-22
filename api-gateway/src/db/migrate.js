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
      port           INT          NOT NULL,
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
  console.log('Migration complete: services table ready');
}

module.exports = migrate;
