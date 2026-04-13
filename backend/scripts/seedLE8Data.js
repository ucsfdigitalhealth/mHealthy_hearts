#!/usr/bin/env node
/**
 * seedLE8Data.js  –  one year of fake LE8 data for a fixed test user.
 *
 * Tables seeded:
 *   1. smoking_assessments        — 12 monthly snapshots
 *   2. blood_sugar_assessments    — 12 monthly snapshots
 *   3. bmi_assessments            — 12 monthly snapshots
 *   4. blood_lipids_assessments   — 12 monthly snapshots
 *   5. diet_assessments           — 12 monthly snapshots
 *   6. fitbit_daily_data          — 365 daily rows (incl. physical_activity_score)
 *   7. fitbit_sleep_data          — 365 daily rows (incl. sleep_score)
 *   8. le8_composite_scores       — 365 daily rows (all 8 LE8 components + composite)
 *
 * Usage:
 *   node scripts/seedLE8Data.js [--dry-run]
 */

const db     = require('../db');
const crypto = require('crypto');
const {
  getBloodGlucoseScore,
  getBMIScore,
  getDietScore,
  getNonHDLScore,
  getNicotineScore,
  getPhysicalActivityScore,
  getSleepScore,
} = require('../metricCalc');

// ─── Constants ───────────────────────────────────────────────────────────────

const USER_ID   = '224d1de8-ee4a-11f0-881c-9c0234fe5fdf';
const STEP_GOAL = 10000; // used by getPhysicalActivityScore

// ─── Utility helpers ─────────────────────────────────────────────────────────

function uuid() { return crypto.randomUUID(); }

function isoDate(d) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function randInt(min, max)   { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max, dec) {
  dec = dec == null ? 2 : dec;
  const p = Math.pow(10, dec);
  return Math.round((Math.random() * (max - min) + min) * p) / p;
}

/** Returns array of ISO date strings for the last `n` days (oldest first). */
function buildDays(n) {
  const today = new Date();
  const days  = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(isoDate(d));
  }
  return days;
}

/** Returns the 1st of each of the last 12 months (oldest first). */
function buildMonthStarts() {
  const today  = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(isoDate(d)); // YYYY-MM-01
  }
  return months;
}

/**
 * Given an array of assessment rows (each having `created_at` = 'YYYY-MM-DD ...')
 * return the score from the latest row whose date is <= targetDate, or null if none.
 */
function latestScore(rows, targetDate) {
  let best = null;
  for (const r of rows) {
    const rowDate = r.created_at.slice(0, 10);
    if (rowDate <= targetDate) best = r.score;
  }
  return best;
}

// ─── Assessment row generators ────────────────────────────────────────────────

/**
 * Smoking: former smoker, quit 1+ years ago, no secondhand exposure.
 * Score = 75 throughout the year.
 */
function genSmokingRow(monthDate) {
  const category  = 'former';
  const time_quit = '1+';
  const secondHand = 0;
  const score = getNicotineScore({
    category,
    frequency: null,
    timeQuit: time_quit,
    secondHandExposure: secondHand,
  });
  return {
    data_id: uuid(),
    user_id: USER_ID,
    category,
    frequency:            null,
    time_quit,
    interest_in_quitting: 'sometime',
    type_smoker:          null,
    second_hand_exposure: secondHand,
    commitment_to_change: 0,
    importance:           null,
    confidence:           null,
    score,
    created_at: `${monthDate} 09:00:00`,
  };
}

/**
 * Blood sugar: fasting glucose trending down from ~150 → ~90 mg/dL over 12 months.
 * Scores improve from 40 → 100.
 */
function genBloodSugarRow(monthDate, idx) {
  const value    = clamp(Math.round(150 - (idx / 11) * 60 + randInt(-6, 6)), 70, 160);
  const testType = 'Fasting Blood Glucose';
  const score    = getBloodGlucoseScore({ testType, value });
  const commit   = idx < 8 ? 1 : 0;
  return {
    data_id: uuid(),
    user_id: USER_ID,
    test_type:            testType,
    value,
    has_diabetes:         0,
    commitment_to_change: commit,
    importance:           commit ? randInt(5, 9) : null,
    confidence:           commit ? randInt(4, 9) : null,
    score,
    created_at: `${monthDate} 09:00:00`,
  };
}

/**
 * BMI: weight loss journey — 210 lbs → 180 lbs over 12 months, height 70 in (5′10″).
 * BMI ~30.1 → ~25.8; score improves 30 → 70 → 100 as they cross thresholds.
 */
function genBMIRow(monthDate, idx, prevBMI) {
  const height = 70; // inches
  const weight = clamp(Math.round(210 - (idx / 11) * 30 + randInt(-2, 2)), 175, 215);
  const bmi_value = Math.round((703 * weight / (height * height)) * 100) / 100;
  const score     = getBMIScore(bmi_value);
  return {
    data_id: uuid(),
    user_id: USER_ID,
    bmi_value,
    weight,
    height,
    previous_bmi:         prevBMI,
    commitment_to_change: 1,
    importance:           randInt(6, 10),
    confidence:           randInt(5, 9),
    score,
    created_at: `${monthDate} 09:00:00`,
  };
}

/**
 * Blood lipids: non-HDL cholesterol improving from ~162 → ~120 mg/dL over 12 months.
 * Scores improve 40 → 60 → 100.
 */
function genBloodLipidsRow(monthDate, idx) {
  const value    = clamp(Math.round(162 - (idx / 11) * 42 + randInt(-8, 8)), 110, 175);
  const score    = getNonHDLScore(value);
  const commit   = idx < 9 ? 1 : 0;
  return {
    data_id: uuid(),
    user_id: USER_ID,
    measure_type:         'non-hdl',
    value,
    medication:           0,
    commitment_to_change: commit,
    importance:           commit ? randInt(5, 9) : null,
    confidence:           commit ? randInt(4, 8) : null,
    score,
    created_at: `${monthDate} 09:00:00`,
  };
}

/**
 * Diet: MEPA score improving from 3 → 9 over 12 months.
 * Each extra MEPA point is achieved by meeting one more criterion.
 */
function genDietRow(monthDate, idx) {
  const targetMEPA = Math.min(10, 3 + Math.floor((idx / 11) * 7));

  // Each criterion contributes 1 MEPA point when the threshold is met.
  // We unlock criteria 1 through targetMEPA to build the target score.
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
    data_id: uuid(),
    user_id: USER_ID,
    ...dietData,
    commitment_to_change: 1,
    importance:           randInt(5, 9),
    confidence:           randInt(5, 9),
    score,
    created_at: `${monthDate} 09:00:00`,
  };
}

// ─── Fitbit daily row generator ───────────────────────────────────────────────

function genFitbitDay(dateStr, dayIndex) {
  // Slight weekday/weekend differentiation; mild upward trend in steps over the year
  const weekdayBoost = dayIndex % 7 < 5 ? 1.1 : 0.85;
  const yearProgress = dayIndex / 364; // 0 → 1 over the year
  const baseSteps    = Math.round((4000 + yearProgress * 3000) * weekdayBoost);
  const steps        = clamp(baseSteps + randInt(-1500, 1500), 500, 14000);

  const minutesLight  = clamp(Math.round(steps / 120 + randInt(-10, 15)), 5, 180);
  const minutesFair   = clamp(randInt(0, 35) + (steps > 7000 ? randInt(0, 20) : 0), 0, 90);
  const minutesVery   = clamp(steps > 8500 ? randInt(5, 30) : randInt(0, 10), 0, 45);

  // Sleep mildly inversely correlated with step count, with random noise
  const minutesAsleep = clamp(
    Math.round(360 + randInt(-40, 80) - (steps - 6000) / 50),
    240, 570,
  );
  const timeInBed  = clamp(minutesAsleep + randInt(15, 75), minutesAsleep, 660);
  const efficiency = clamp(
    Math.round((randFloat(77, 97) - (timeInBed - minutesAsleep) / 80) * 100) / 100,
    50, 99.99,
  );

  const paScore    = getPhysicalActivityScore(steps, STEP_GOAL);
  const sleepScore = getSleepScore(minutesAsleep / 60);

  return {
    dateStr, steps, minutesLight, minutesFair, minutesVery,
    minutesAsleep, timeInBed, efficiency, paScore, sleepScore,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`Seeding LE8 data for user ${USER_ID}${dryRun ? ' [dry-run]' : ''}...`);

  // ── Build assessment rows ───────────────────────────────────────────────────
  const monthStarts = buildMonthStarts(); // 12 YYYY-MM-01 strings, oldest first

  const smokingRows     = monthStarts.map((d)     => genSmokingRow(d));
  const bloodSugarRows  = monthStarts.map((d, i)  => genBloodSugarRow(d, i));
  const bloodLipidsRows = monthStarts.map((d, i)  => genBloodLipidsRow(d, i));
  const dietRows        = monthStarts.map((d, i)  => genDietRow(d, i));

  const bmiRows = [];
  let prevBMI = null;
  for (let i = 0; i < monthStarts.length; i++) {
    const row = genBMIRow(monthStarts[i], i, prevBMI);
    bmiRows.push(row);
    prevBMI = row.bmi_value;
  }

  // ── Build Fitbit rows ───────────────────────────────────────────────────────
  const days      = buildDays(365); // 365 ISO date strings, oldest first
  const fitbitMap = {}; // dateStr → fitbit row
  days.forEach((d, i) => { fitbitMap[d] = genFitbitDay(d, i); });

  // ── Build composite rows ────────────────────────────────────────────────────
  const compositeRows = days.map(dateStr => {
    const fb  = fitbitMap[dateStr];
    const paScore    = fb ? fb.paScore    : null;
    const sleepScore = fb ? fb.sleepScore : null;

    const dietScore       = latestScore(dietRows,        dateStr);
    const nicotineScore   = latestScore(smokingRows,     dateStr);
    const bmiScore        = latestScore(bmiRows,         dateStr);
    const lipidsScore     = latestScore(bloodLipidsRows, dateStr);
    const sugarScore      = latestScore(bloodSugarRows,  dateStr);
    const bpScore         = null; // blood pressure not yet implemented

    const allComponents = [dietScore, paScore, nicotineScore, sleepScore,
                           bmiScore, lipidsScore, sugarScore, bpScore];
    const nonNull = allComponents.filter(s => s != null);
    const composite = nonNull.length
      ? Math.round(nonNull.reduce((a, b) => a + b, 0) / nonNull.length * 100) / 100
      : null;

    return {
      id:                     uuid(),
      user_id:                USER_ID,
      score_date:             dateStr,
      diet_score:             dietScore,
      physical_activity_score: paScore,
      nicotine_score:         nicotineScore,
      sleep_score:            sleepScore,
      bmi_score:              bmiScore,
      blood_lipids_score:     lipidsScore,
      blood_sugar_score:      sugarScore,
      blood_pressure_score:   bpScore,
      composite_score:        composite,
      components_counted:     nonNull.length,
    };
  });

  // ── Dry-run preview ─────────────────────────────────────────────────────────
  if (dryRun) {
    console.log('\n── Sample rows ──────────────────────────────────────');
    console.log('smoking:      ', smokingRows[0]);
    console.log('blood_sugar:  ', bloodSugarRows[0]);
    console.log('bmi:          ', bmiRows[0]);
    console.log('blood_lipids: ', bloodLipidsRows[0]);
    console.log('diet:         ', dietRows[0]);
    console.log('fitbit daily: ', Object.values(fitbitMap)[0]);
    console.log('composite:    ', compositeRows[0]);
    process.exit(0);
  }

  // ── INSERT smoking_assessments ───────────────────────────────────────────────
  console.log(`Inserting ${smokingRows.length} smoking rows...`);
  for (const r of smokingRows) {
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

  // ── INSERT blood_sugar_assessments ───────────────────────────────────────────
  console.log(`Inserting ${bloodSugarRows.length} blood sugar rows...`);
  for (const r of bloodSugarRows) {
    await db.execute(
      `INSERT INTO blood_sugar_assessments
         (data_id, user_id, test_type, value, has_diabetes, commitment_to_change,
          importance, confidence, score, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [r.data_id, r.user_id, r.test_type, r.value, r.has_diabetes,
       r.commitment_to_change, r.importance, r.confidence, r.score, r.created_at],
    );
  }

  // ── INSERT bmi_assessments ───────────────────────────────────────────────────
  console.log(`Inserting ${bmiRows.length} BMI rows...`);
  for (const r of bmiRows) {
    await db.execute(
      `INSERT INTO bmi_assessments
         (data_id, user_id, bmi_value, weight, height, previous_bmi,
          commitment_to_change, importance, confidence, score, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [r.data_id, r.user_id, r.bmi_value, r.weight, r.height, r.previous_bmi,
       r.commitment_to_change, r.importance, r.confidence, r.score, r.created_at],
    );
  }

  // ── INSERT blood_lipids_assessments ──────────────────────────────────────────
  console.log(`Inserting ${bloodLipidsRows.length} blood lipids rows...`);
  for (const r of bloodLipidsRows) {
    await db.execute(
      `INSERT INTO blood_lipids_assessments
         (data_id, user_id, measure_type, value, medication, commitment_to_change,
          importance, confidence, score, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [r.data_id, r.user_id, r.measure_type, r.value, r.medication,
       r.commitment_to_change, r.importance, r.confidence, r.score, r.created_at],
    );
  }

  // ── INSERT diet_assessments ───────────────────────────────────────────────────
  console.log(`Inserting ${dietRows.length} diet rows...`);
  for (const r of dietRows) {
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

  // ── INSERT fitbit_daily_data ──────────────────────────────────────────────────
  const fitbitRows = Object.values(fitbitMap);
  console.log(`Inserting ${fitbitRows.length} fitbit daily rows...`);
  for (const r of fitbitRows) {
    await db.execute(
      `INSERT INTO fitbit_daily_data
         (data_id, user_id, date, steps, minutes_lightly_active, minutes_fairly_active,
          minutes_very_active, physical_activity_score)
       VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         steps                   = VALUES(steps),
         minutes_lightly_active  = VALUES(minutes_lightly_active),
         minutes_fairly_active   = VALUES(minutes_fairly_active),
         minutes_very_active     = VALUES(minutes_very_active),
         physical_activity_score = VALUES(physical_activity_score)`,
      [uuid(), USER_ID, r.dateStr, r.steps,
       r.minutesLight, r.minutesFair, r.minutesVery, r.paScore],
    );
  }

  // ── INSERT fitbit_sleep_data ──────────────────────────────────────────────────
  console.log(`Inserting ${fitbitRows.length} fitbit sleep rows...`);
  for (const r of fitbitRows) {
    await db.execute(
      `INSERT INTO fitbit_sleep_data
         (data_id, user_id, date, total_minutes_asleep, total_time_in_bed,
          sleep_efficiency, sleep_score)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         total_minutes_asleep = VALUES(total_minutes_asleep),
         total_time_in_bed    = VALUES(total_time_in_bed),
         sleep_efficiency     = VALUES(sleep_efficiency),
         sleep_score          = VALUES(sleep_score)`,
      [uuid(), USER_ID, r.dateStr, r.minutesAsleep, r.timeInBed, r.efficiency, r.sleepScore],
    );
  }

  // ── INSERT le8_composite_scores ───────────────────────────────────────────────
  console.log(`Inserting ${compositeRows.length} composite score rows...`);
  for (const r of compositeRows) {
    await db.execute(
      `INSERT INTO le8_composite_scores
         (id, user_id, score_date,
          diet_score, physical_activity_score, nicotine_score, sleep_score,
          bmi_score, blood_lipids_score, blood_sugar_score, blood_pressure_score,
          composite_score, components_counted)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         diet_score              = VALUES(diet_score),
         physical_activity_score = VALUES(physical_activity_score),
         nicotine_score          = VALUES(nicotine_score),
         sleep_score             = VALUES(sleep_score),
         bmi_score               = VALUES(bmi_score),
         blood_lipids_score      = VALUES(blood_lipids_score),
         blood_sugar_score       = VALUES(blood_sugar_score),
         blood_pressure_score    = VALUES(blood_pressure_score),
         composite_score         = VALUES(composite_score),
         components_counted      = VALUES(components_counted)`,
      [r.id, r.user_id, r.score_date,
       r.diet_score, r.physical_activity_score, r.nicotine_score, r.sleep_score,
       r.bmi_score, r.blood_lipids_score, r.blood_sugar_score, r.blood_pressure_score,
       r.composite_score, r.components_counted],
    );
  }

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('\nDone!');
  console.log(`  smoking_assessments:      ${smokingRows.length} rows`);
  console.log(`  blood_sugar_assessments:  ${bloodSugarRows.length} rows`);
  console.log(`  bmi_assessments:          ${bmiRows.length} rows`);
  console.log(`  blood_lipids_assessments: ${bloodLipidsRows.length} rows`);
  console.log(`  diet_assessments:         ${dietRows.length} rows`);
  console.log(`  fitbit_daily_data:        ${fitbitRows.length} rows`);
  console.log(`  fitbit_sleep_data:        ${fitbitRows.length} rows`);
  console.log(`  le8_composite_scores:     ${compositeRows.length} rows`);
  process.exit(0);
}

main().catch(err => {
  console.error('Seed script failed:', err);
  process.exit(1);
});