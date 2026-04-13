#!/usr/bin/env node
/**
 * seedBloodSugar.js — seed fake blood_sugar_assessments for a user.
 *
 * Usage:
 *   node scripts/seedBloodSugar.js --user <user_uuid> [--months 12] [--dry-run]
 *
 * Generates one row per month (oldest first).
 * Profile: fasting glucose trending down from ~150 → ~90 mg/dL (score 40 → 100).
 */
const db     = require('../db');
const crypto = require('crypto');
const { getBloodGlucoseScore } = require('../metricCalc');

// ─── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { user: null, months: 12, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--user'   || a === '-u') out.user   = argv[++i];
    else if (a === '--months' || a === '-m') out.months = Number(argv[++i]);
    else if (a === '--dry-run')              out.dryRun = true;
    else if (a === '--help' || a === '-h')   out.help   = true;
  }
  return out;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function buildMonthStarts(n) {
  const today = new Date();
  const out   = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    out.push(isoDate(d));
  }
  return out;
}

function genRow(userId, monthDate, idx, total) {
  const value    = clamp(Math.round(150 - (idx / (total - 1)) * 60 + randInt(-6, 6)), 70, 160);
  const testType = 'Fasting Blood Glucose';
  const score    = getBloodGlucoseScore({ testType, value });
  const commit   = idx < Math.floor(total * 0.67) ? 1 : 0;
  return {
    data_id:              crypto.randomUUID(),
    user_id:              userId,
    test_type:            testType,
    value,
    has_diabetes:         0,
    commitment_to_change: commit,
    importance:           commit ? randInt(5, 9) : null,
    confidence:           commit ? randInt(4, 9) : null,
    score,
    created_at:           `${monthDate} 09:00:00`,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log([
      'Seed fake blood_sugar_assessments.',
      '',
      'Usage:',
      '  node scripts/seedBloodSugar.js --user <uuid> [--months 12] [--dry-run]',
    ].join('\n'));
    process.exit(0);
  }

  const userId = args.user || process.env.SEED_USER_ID || null;
  if (!userId) { console.error('Missing --user <uuid>.'); process.exit(1); }

  const months      = Number.isFinite(args.months) && args.months > 0 ? args.months : 12;
  const monthStarts = buildMonthStarts(months);
  const rows        = monthStarts.map((d, i) => genRow(userId, d, i, months));

  console.log(`Seeding ${rows.length} blood sugar rows for user ${userId}${args.dryRun ? ' [dry-run]' : ''}...`);
  if (args.dryRun) { console.log('Sample:', rows[0]); process.exit(0); }

  for (const r of rows) {
    await db.execute(
      `INSERT INTO blood_sugar_assessments
         (data_id, user_id, test_type, value, has_diabetes, commitment_to_change,
          importance, confidence, score, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [r.data_id, r.user_id, r.test_type, r.value, r.has_diabetes,
       r.commitment_to_change, r.importance, r.confidence, r.score, r.created_at],
    );
  }

  console.log(`Done. Inserted ${rows.length} blood sugar rows.`);
  process.exit(0);
}

main().catch(err => { console.error('Seed failed:', err); process.exit(1); });
