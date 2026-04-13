#!/usr/bin/env node
/**
 * seedDiet.js — seed fake diet_assessments for a user.
 *
 * Usage:
 *   node scripts/seedDiet.js --user <user_uuid> [--months 12] [--dry-run]
 *
 * Generates one row per month (oldest first).
 * Profile: MEPA score improving from 3 → 9 over the period (score 25 → 100).
 */
const db     = require('../db');
const crypto = require('crypto');
const { getDietScore } = require('../metricCalc');

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

function randFloat(min, max, dec = 2) {
  const p = Math.pow(10, dec);
  return Math.round((Math.random() * (max - min) + min) * p) / p;
}

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
  // Unlock MEPA criteria progressively: starts at 3, reaches 9 by last month
  const targetMEPA = Math.min(10, 3 + Math.floor((idx / (total - 1)) * 7));

  const vegetables_per_day     = targetMEPA >= 1  ? randFloat(2.0, 4.0) : randFloat(0.2, 1.5);
  const fruit_per_day          = targetMEPA >= 2  ? randFloat(1.0, 3.0) : randFloat(0.1, 0.9);
  const red_meat_per_week      = targetMEPA >= 3  ? randFloat(0.5, 3.0) : randFloat(3.1, 7.0);
  const fish_per_week          = targetMEPA >= 4  ? randFloat(1.0, 3.0) : randFloat(0.1, 0.9);
  const butter_per_week        = targetMEPA >= 5  ? randFloat(1.0, 4.5) : randFloat(5.1, 9.0);
  const beans_per_week         = targetMEPA >= 6  ? randFloat(3.0, 6.0) : randFloat(0.5, 2.5);
  const whole_grains_per_day   = targetMEPA >= 7  ? randFloat(3.0, 5.0) : randFloat(0.5, 2.5);
  const sweets_per_week        = targetMEPA >= 8  ? randFloat(1.0, 4.0) : randFloat(4.1, 9.0);
  const fast_food_per_week     = targetMEPA >= 9  ? randFloat(0.0, 1.0) : randFloat(1.1, 4.0);
  const sugary_drinks_per_week = targetMEPA >= 10 ? randFloat(7.0, 12.0) : randFloat(1.0, 5.0);

  const dietData = {
    vegetables_per_day, fruit_per_day, red_meat_per_week, fish_per_week,
    butter_per_week, beans_per_week, whole_grains_per_day, sweets_per_week,
    fast_food_per_week, sugary_drinks_per_week,
  };
  const result = getDietScore(dietData);
  const score  = result ? result.displayScore : 0;

  return {
    data_id:              crypto.randomUUID(),
    user_id:              userId,
    ...dietData,
    commitment_to_change: 1,
    importance:           randInt(5, 9),
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
      'Seed fake diet_assessments.',
      '',
      'Usage:',
      '  node scripts/seedDiet.js --user <uuid> [--months 12] [--dry-run]',
    ].join('\n'));
    process.exit(0);
  }

  const userId = args.user || process.env.SEED_USER_ID || null;
  if (!userId) { console.error('Missing --user <uuid>.'); process.exit(1); }

  const months      = Number.isFinite(args.months) && args.months > 0 ? args.months : 12;
  const monthStarts = buildMonthStarts(months);
  const rows        = monthStarts.map((d, i) => genRow(userId, d, i, months));

  console.log(`Seeding ${rows.length} diet rows for user ${userId}${args.dryRun ? ' [dry-run]' : ''}...`);
  if (args.dryRun) { console.log('Sample:', rows[0]); process.exit(0); }

  for (const r of rows) {
    await db.execute(
      `INSERT INTO diet_assessments
         (data_id, user_id, vegetables_per_day, fruit_per_day, red_meat_per_week,
          fish_per_week, butter_per_week, beans_per_week, whole_grains_per_day,
          sweets_per_week, fast_food_per_week, sugary_drinks_per_week,
          commitment_to_change, importance, confidence, score, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [r.data_id, r.user_id, r.vegetables_per_day, r.fruit_per_day, r.red_meat_per_week,
       r.fish_per_week, r.butter_per_week, r.beans_per_week, r.whole_grains_per_day,
       r.sweets_per_week, r.fast_food_per_week, r.sugary_drinks_per_week,
       r.commitment_to_change, r.importance, r.confidence, r.score, r.created_at],
    );
  }

  console.log(`Done. Inserted ${rows.length} diet rows.`);
  process.exit(0);
}

main().catch(err => { console.error('Seed failed:', err); process.exit(1); });
