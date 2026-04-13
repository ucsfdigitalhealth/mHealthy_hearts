#!/usr/bin/env node
/**
 * seedBMI.js — seed fake bmi_assessments for a user.
 *
 * Usage:
 *   node scripts/seedBMI.js --user <user_uuid> [--months 12] [--dry-run]
 *
 * Generates one row per month (oldest first).
 * Profile: weight-loss journey 210 lbs → 180 lbs over the period, height 70 in (5'10").
 * BMI ~30.1 → ~25.8; score improves as thresholds are crossed.
 */
const db     = require('../db');
const crypto = require('crypto');
const { getBMIScore } = require('../metricCalc');

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

function genRow(userId, monthDate, idx, total, prevBMI) {
  const height    = 70; // inches
  const weight    = clamp(Math.round(210 - (idx / (total - 1)) * 30 + randInt(-2, 2)), 175, 215);
  const bmi_value = Math.round((703 * weight / (height * height)) * 100) / 100;
  const score     = getBMIScore(bmi_value);
  return {
    data_id:              crypto.randomUUID(),
    user_id:              userId,
    bmi_value,
    weight,
    height,
    previous_bmi:         prevBMI,
    commitment_to_change: 1,
    importance:           randInt(6, 10),
    confidence:           randInt(5, 9),
    score,
    created_at:           `${monthDate} 09:00:00`,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log([
      'Seed fake bmi_assessments.',
      '',
      'Usage:',
      '  node scripts/seedBMI.js --user <uuid> [--months 12] [--dry-run]',
    ].join('\n'));
    process.exit(0);
  }

  const userId = args.user || process.env.SEED_USER_ID || null;
  if (!userId) { console.error('Missing --user <uuid>.'); process.exit(1); }

  const months      = Number.isFinite(args.months) && args.months > 0 ? args.months : 12;
  const monthStarts = buildMonthStarts(months);

  const rows = [];
  let prevBMI = null;
  for (let i = 0; i < monthStarts.length; i++) {
    const row = genRow(userId, monthStarts[i], i, months, prevBMI);
    rows.push(row);
    prevBMI = row.bmi_value;
  }

  console.log(`Seeding ${rows.length} BMI rows for user ${userId}${args.dryRun ? ' [dry-run]' : ''}...`);
  if (args.dryRun) { console.log('Sample:', rows[0]); process.exit(0); }

  for (const r of rows) {
    await db.execute(
      `INSERT INTO bmi_assessments
         (data_id, user_id, bmi_value, weight, height, previous_bmi,
          commitment_to_change, importance, confidence, score, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [r.data_id, r.user_id, r.bmi_value, r.weight, r.height, r.previous_bmi,
       r.commitment_to_change, r.importance, r.confidence, r.score, r.created_at],
    );
  }

  console.log(`Done. Inserted ${rows.length} BMI rows.`);
  process.exit(0);
}

main().catch(err => { console.error('Seed failed:', err); process.exit(1); });
