#!/usr/bin/env node
/**
 * Seed fake Fitbit steps + sleep rows for a given user into:
 *  - fitbit_daily_data
 *  - fitbit_sleep_data
 *
 * Usage:
 *   node scripts/seedFitbitData.js --user <user_uuid> [--days 30] [--last-year] [--end YYYY-MM-DD] [--dry-run]
 *
 * Notes:
 * - Requires MySQL connection configured in backend/db.js (MAMP socket, db mhearts).
 * - Uses INSERT ... ON DUPLICATE KEY UPDATE (tables have UNIQUE(user_id, date)).
 */
const db = require('../db');
const crypto = require('crypto');

function parseArgs(argv) {
  const out = { days: 30, end: null, user: null, dryRun: false, lastYear: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--user' || a === '-u') out.user = argv[++i];
    else if (a === '--days' || a === '-d') out.days = Number(argv[++i]);
    else if (a === '--end') out.end = argv[++i];
    else if (a === '--last-year') out.lastYear = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function isoDate(d) {
  // YYYY-MM-DD in local time (good enough for seeding)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, decimals = 2) {
  const v = Math.random() * (max - min) + min;
  const p = Math.pow(10, decimals);
  return Math.round(v * p) / p;
}

function generateDay(seedIndexFromEnd) {
  // Create mild trends: weekdays higher, some random noise
  const weekdayBoost = seedIndexFromEnd % 7 < 5 ? 1.1 : 0.9;
  const baseSteps = randInt(2500, 11000);
  const steps = Math.round(baseSteps * weekdayBoost);

  const minutesLight = clamp(Math.round((steps / 120) + randInt(-10, 15)), 5, 180);
  const minutesFair = clamp(randInt(0, 40) + (steps > 7000 ? randInt(0, 20) : 0), 0, 90);
  const minutesVery = clamp(steps > 9000 ? randInt(5, 30) : randInt(0, 10), 0, 45);

  // Sleep is roughly inversely related to steps, but with randomness
  const minutesAsleep = clamp(
    Math.round(randInt(300, 520) - (steps - 6000) / 40 + randInt(-20, 20)),
    240,
    600
  );
  const timeInBed = clamp(minutesAsleep + randInt(15, 90), minutesAsleep, 720);
  const efficiencyRaw = clamp(randFloat(75, 97, 2) - (timeInBed - minutesAsleep) / 80, 50, 99.99);
  const efficiency = Math.round(efficiencyRaw * 100) / 100;

  return {
    steps,
    minutesLight,
    minutesFair,
    minutesVery,
    minutesAsleep,
    timeInBed,
    efficiency,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(
      [
        'Seed fake Fitbit steps + sleep data.',
        '',
        'Usage:',
        '  node scripts/seedFitbitData.js --user <user_uuid> [--days 30] [--last-year] [--end YYYY-MM-DD] [--dry-run]',
        '',
        'Examples:',
        '  node scripts/seedFitbitData.js --user 3f5... --days 45',
        '  node scripts/seedFitbitData.js --user 3f5... --last-year',
        '  node scripts/seedFitbitData.js --user 3f5... --days 7 --end 2026-02-23',
      ].join('\n')
    );
    process.exit(0);
  }

  if (args.lastYear && !(Number.isFinite(args.days) && args.days !== 30)) {
    // If user didn't explicitly set --days, last-year means 365 days.
    args.days = 365;
  }

  const userId = args.user || process.env.SEED_USER_ID || null;
  if (!userId) {
    console.error('Missing user id. Provide --user <uuid> or set SEED_USER_ID.');
    process.exit(1);
  }
  if (!Number.isFinite(args.days) || args.days <= 0 || args.days > 3650) {
    console.error('--days must be a positive number (<= 3650).');
    process.exit(1);
  }

  const endDate = args.end ? new Date(`${args.end}T12:00:00`) : new Date();
  if (Number.isNaN(endDate.getTime())) {
    console.error('Invalid --end date. Use YYYY-MM-DD.');
    process.exit(1);
  }

  const dailyUpsertSql = `
    INSERT INTO fitbit_daily_data
      (data_id, user_id, date, steps, minutes_lightly_active, minutes_fairly_active, minutes_very_active)
    VALUES
      (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      steps = VALUES(steps),
      minutes_lightly_active = VALUES(minutes_lightly_active),
      minutes_fairly_active = VALUES(minutes_fairly_active),
      minutes_very_active = VALUES(minutes_very_active)
  `;

  const sleepUpsertSql = `
    INSERT INTO fitbit_sleep_data
      (data_id, user_id, date, total_minutes_asleep, total_time_in_bed, sleep_efficiency)
    VALUES
      (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      total_minutes_asleep = VALUES(total_minutes_asleep),
      total_time_in_bed = VALUES(total_time_in_bed),
      sleep_efficiency = VALUES(sleep_efficiency)
  `;

  const rows = [];
  for (let i = 0; i < args.days; i++) {
    const d = new Date(endDate);
    d.setDate(endDate.getDate() - i);
    rows.push({ date: isoDate(d), ...generateDay(i) });
  }

  console.log(
    `Seeding ${rows.length} days for user ${userId} (end=${isoDate(endDate)})${args.dryRun ? ' [dry-run]' : ''}`
  );

  if (args.dryRun) {
    console.log('Sample row:', rows[0]);
    process.exit(0);
  }

  let insertedDaily = 0;
  let insertedSleep = 0;

  for (const r of rows) {
    await db.execute(dailyUpsertSql, [
      crypto.randomUUID(),
      userId,
      r.date,
      r.steps,
      r.minutesLight,
      r.minutesFair,
      r.minutesVery,
    ]);
    insertedDaily++;

    await db.execute(sleepUpsertSql, [
      crypto.randomUUID(),
      userId,
      r.date,
      r.minutesAsleep,
      r.timeInBed,
      r.efficiency,
    ]);
    insertedSleep++;
  }

  console.log(`Done. Upserted daily=${insertedDaily}, sleep=${insertedSleep}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});

