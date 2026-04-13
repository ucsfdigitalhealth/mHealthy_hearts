#!/usr/bin/env node
/**
 * seedSmoking.js — seed fake smoking_assessments for a user.
 *
 * Usage:
 *   node scripts/seedSmoking.js --user <user_uuid> [--months 12] [--dry-run]
 *
 * Generates one row per month (oldest first).
 * Profile: former smoker, quit 1+ years ago, no secondhand exposure — score = 75.
 */
const db     = require('../db');
const crypto = require('crypto');
const { getNicotineScore } = require('../metricCalc');

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

/** Returns YYYY-MM-01 strings for the last `n` months, oldest first. */
function buildMonthStarts(n) {
  const today = new Date();
  const out   = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    out.push(isoDate(d));
  }
  return out;
}

function genRow(userId, monthDate) {
  const category  = 'former';
  const time_quit = '1+';
  const score = getNicotineScore({ category, frequency: null, timeQuit: time_quit, secondHandExposure: 0 });
  return {
    data_id:              crypto.randomUUID(),
    user_id:              userId,
    category,
    frequency:            null,
    time_quit,
    interest_in_quitting: 'sometime',
    type_smoker:          null,
    second_hand_exposure: 0,
    commitment_to_change: 0,
    importance:           null,
    confidence:           null,
    score,
    created_at:           `${monthDate} 09:00:00`,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log([
      'Seed fake smoking_assessments.',
      '',
      'Usage:',
      '  node scripts/seedSmoking.js --user <uuid> [--months 12] [--dry-run]',
    ].join('\n'));
    process.exit(0);
  }

  const userId = args.user || process.env.SEED_USER_ID || null;
  if (!userId) { console.error('Missing --user <uuid>.'); process.exit(1); }

  const months = Number.isFinite(args.months) && args.months > 0 ? args.months : 12;
  const rows   = buildMonthStarts(months).map(d => genRow(userId, d));

  console.log(`Seeding ${rows.length} smoking rows for user ${userId}${args.dryRun ? ' [dry-run]' : ''}...`);
  if (args.dryRun) { console.log('Sample:', rows[0]); process.exit(0); }

  for (const r of rows) {
    await db.execute(
      `INSERT INTO smoking_assessments
         (data_id, user_id, category, frequency, time_quit, interest_in_quitting,
          type_smoker, second_hand_exposure, commitment_to_change,
          importance, confidence, score, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [r.data_id, r.user_id, r.category, r.frequency, r.time_quit,
       r.interest_in_quitting, r.type_smoker, r.second_hand_exposure,
       r.commitment_to_change, r.importance, r.confidence, r.score, r.created_at],
    );
  }

  console.log(`Done. Inserted ${rows.length} smoking rows.`);
  process.exit(0);
}

main().catch(err => { console.error('Seed failed:', err); process.exit(1); });
