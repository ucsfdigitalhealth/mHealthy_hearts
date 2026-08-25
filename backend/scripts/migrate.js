#!/usr/bin/env node
/**
 * migrate.js — one-off schema migration runner for RDS.
 *
 * Runs `migrations/full_migrate_additive.sql` (the non-destructive, idempotent
 * variant: CREATE TABLE IF NOT EXISTS, no DROPs) against the production MySQL
 * instance. Designed to execute as a one-off ECS task inside the VPC, because
 * RDS lives in an isolated subnet and is not reachable from the local machine.
 *
 * Connection settings come from the same DB_* env vars the app uses
 * (DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/DB_SSL/DB_SSL_CA), which ECS
 * injects from Secrets Manager via the task definition. The additive SQL has
 * no DELIMITER / stored-procedure blocks, so the whole file is sent as a single
 * multi-statement query (multipleStatements: true). `SET FOREIGN_KEY_CHECKS`
 * statements in the file scope to this connection's session, so the circular
 * ema_enrollments <-> symptom_instrument_responses FK is handled correctly.
 *
 * Usage:
 *   node scripts/migrate.js                      # default: ../migrations/full_migrate_additive.sql
 *   MIGRATE_SQL=/app/migrations/x.sql node scripts/migrate.js
 *
 * Exits 0 on success, 1 on failure. Prints a table/FK count at the end so the
 * CloudWatch log line doubles as verification.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Mirrors buildSslConfig() in db.js so this runner verifies RDS TLS the same
// way the app does, without depending on the shared pool (which does not enable
// multipleStatements).
function buildSslConfig() {
  if (process.env.DB_SSL === 'false') return undefined;
  const caPath = process.env.DB_SSL_CA || '/app/certs/global-bundle.pem';
  let ca = null;
  try {
    ca = fs.readFileSync(caPath);
  } catch (_) {
    /* CA bundle not available -> fall back to encrypted, unverified TLS */
  }
  if (ca) return { ca, rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

async function main() {
  const sqlPath = process.env.MIGRATE_SQL
    || path.resolve(__dirname, '../migrations/full_migrate_additive.sql');

  if (!process.env.DB_HOST) {
    throw new Error('DB_HOST is not set; this script must run with the production DB env vars (use it as an ECS task, not locally).');
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log(`[migrate] SQL file: ${sqlPath} (${sql.length} bytes)`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: buildSslConfig(),
    multipleStatements: true,
  });

  console.log(`[migrate] connected to ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME}`);

  try {
    console.log('[migrate] executing migration...');
    await connection.query(sql);
    console.log('[migrate] migration SQL executed successfully');

    // ---- verification (information_schema, no assumptions about contents) ----
    const schema = process.env.DB_NAME;
    const [[tables]] = await connection.query(
      'SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ?',
      [schema],
    );
    const [[fks]] = await connection.query(
      'SELECT COUNT(*) AS n FROM information_schema.referential_constraints WHERE constraint_schema = ?',
      [schema],
    );
    const [[legacy]] = await connection.query(
      "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ? AND table_name = 'user_goals'",
      [schema],
    );
    console.log(
      `[migrate] result: tables=${tables.n} foreign_keys=${fks.n} user_goals_exists=${legacy.n}`,
    );
    if (legacy.n > 0) {
      console.warn('[migrate] WARNING: legacy user_goals table still present (additive variant does not drop it; expected on a fresh RDS).');
    }
  } finally {
    await connection.end();
  }

  console.log('[migrate] done');
}

main().catch((err) => {
  console.error('[migrate] FAILED:', err && err.message ? err.message : err);
  if (err && err.stack) console.error(err.stack);
  process.exit(1);
});