/**
 * upsertCompositeScore — compute and persist today's LE8 composite score.
 *
 * Reads the latest assessment for each LE8 metric (blood lipids, blood sugar,
 * BMI, diet, smoking) plus today's Fitbit steps and yesterday's sleep, then
 * upserts a row into le8_composite_scores for today's date.
 *
 * Non-fatal: errors are logged but not re-thrown so that assessment POST
 * routes can call this without risking the user-visible response.
 */

const crypto = require('crypto');
const {
  getBloodGlucoseScore,
  getBMIScore,
  getDietScore,
  getNonHDLScore,
  getNicotineScore,
  getPhysicalActivityScore,
  getSleepScore,
} = require('../metricCalc.js');

async function upsertCompositeScore(userId, db) {
  try {
    const today     = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // ── Blood Lipids ─────────────────────────────────────────────────────────
    const [blRows] = await db.execute(
      'SELECT value FROM blood_lipids_assessments WHERE user_id = ? AND value IS NOT NULL ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    const bloodLipidsScore = blRows.length > 0 ? getNonHDLScore(Number(blRows[0].value)) : null;

    // ── Blood Sugar ──────────────────────────────────────────────────────────
    const [bsRows] = await db.execute(
      'SELECT test_type, value FROM blood_sugar_assessments WHERE user_id = ? AND value IS NOT NULL ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    const bloodSugarScore = bsRows.length > 0
      ? getBloodGlucoseScore({ testType: bsRows[0].test_type, value: Number(bsRows[0].value) })
      : null;

    // ── BMI ──────────────────────────────────────────────────────────────────
    const [bmiRows] = await db.execute(
      'SELECT bmi_value FROM bmi_assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    const bmiScore = bmiRows.length > 0 ? getBMIScore(Number(bmiRows[0].bmi_value)) : null;

    // ── Diet ─────────────────────────────────────────────────────────────────
    const [dietRows] = await db.execute(
      'SELECT * FROM diet_assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    const dietResult = dietRows.length > 0 ? getDietScore(dietRows[0]) : null;
    const dietScore  = dietResult ? dietResult.displayScore : null;

    // ── Smoking ──────────────────────────────────────────────────────────────
    const [smokingRows] = await db.execute(
      'SELECT category, frequency, time_quit, second_hand_exposure FROM smoking_assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    const nicotineScore = smokingRows.length > 0
      ? getNicotineScore({
          category:           smokingRows[0].category,
          frequency:          smokingRows[0].frequency,
          timeQuit:           smokingRows[0].time_quit,
          secondHandExposure: smokingRows[0].second_hand_exposure,
        })
      : null;

    // ── Physical Activity (today's Fitbit steps) ─────────────────────────────
    const [activityRows] = await db.execute(
      'SELECT steps FROM fitbit_daily_data WHERE user_id = ? AND date = ? ORDER BY updated_at DESC LIMIT 1',
      [userId, today]
    );
    const [goalRows] = await db.execute(
      'SELECT step_target FROM daily_goals WHERE user_id = ? AND goal_date = ?',
      [userId, today]
    );
    const paSteps  = activityRows.length > 0 && activityRows[0].steps != null ? Number(activityRows[0].steps) : null;
    const goalSteps = goalRows.length > 0 ? Number(goalRows[0].step_target) : 10000;
    const physicalActivityScore = paSteps !== null ? getPhysicalActivityScore(paSteps, goalSteps) : null;

    // ── Sleep (yesterday's Fitbit sleep) ─────────────────────────────────────
    const [sleepDbRows] = await db.execute(
      'SELECT total_minutes_asleep FROM fitbit_sleep_data WHERE user_id = ? AND date = ? ORDER BY updated_at DESC LIMIT 1',
      [userId, yesterday]
    );
    const sleepHours = sleepDbRows.length > 0 && sleepDbRows[0].total_minutes_asleep != null
      ? Number(sleepDbRows[0].total_minutes_asleep) / 60
      : null;
    const sleepScore = sleepHours !== null ? getSleepScore(sleepHours) : null;

    // ── Composite average ─────────────────────────────────────────────────────
    const components = [
      bloodLipidsScore, bloodSugarScore, bmiScore,
      dietScore, nicotineScore, physicalActivityScore, sleepScore,
    ].filter((s) => s !== null);

    const compositeScore = components.length > 0
      ? Math.round(components.reduce((a, b) => a + b, 0) / components.length * 100) / 100
      : null;

    // ── Upsert ────────────────────────────────────────────────────────────────
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO le8_composite_scores (
         id, user_id, score_date,
         diet_score, physical_activity_score, nicotine_score, sleep_score,
         bmi_score, blood_lipids_score, blood_sugar_score,
         composite_score, components_counted
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         diet_score              = VALUES(diet_score),
         physical_activity_score = VALUES(physical_activity_score),
         nicotine_score          = VALUES(nicotine_score),
         sleep_score             = VALUES(sleep_score),
         bmi_score               = VALUES(bmi_score),
         blood_lipids_score      = VALUES(blood_lipids_score),
         blood_sugar_score       = VALUES(blood_sugar_score),
         composite_score         = VALUES(composite_score),
         components_counted      = VALUES(components_counted)`,
      [
        id, userId, today,
        dietScore, physicalActivityScore, nicotineScore, sleepScore,
        bmiScore, bloodLipidsScore, bloodSugarScore,
        compositeScore, components.length,
      ]
    );
  } catch (err) {
    console.error('[upsertCompositeScore] Error:', err.message);
  }
}

module.exports = { upsertCompositeScore };
