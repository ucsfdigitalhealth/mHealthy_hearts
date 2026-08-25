const mysql = require('mysql2');
const fs = require('fs');
require('dotenv').config();

// Build the SSL config used for TCP connections to RDS.
//   DB_SSL=false            -> no SSL
//   DB_SSL_CA path present   -> verified TLS against the provided CA bundle
//   otherwise               -> encrypted TLS without cert verification
// (Ignored for the local MAMP socket fallback below.)
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

// When DB_HOST is set, connect over TCP to RDS using env vars (production).
// Otherwise fall back to the local MAMP Unix socket so local dev is unchanged.
const poolConfig = process.env.DB_HOST
  ? {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: buildSslConfig(),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    }
  : {
      user: 'root',
      password: 'root',
      database: 'mhearts',
      socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock',
      waitForConnections: true,
      connectionLimit: 10,
    };

// createPool connects lazily (unlike createConnection, which connected eagerly
// and crashed the process if the DB was unreachable on boot). A pool keeps the
// process alive so the /health check can pass during a deploy.
const pool = mysql.createPool(poolConfig);

console.log(
  process.env.DB_HOST
    ? `[db] TCP pool -> ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME}`
    : '[db] Local MAMP socket pool'
);

module.exports = pool.promise();