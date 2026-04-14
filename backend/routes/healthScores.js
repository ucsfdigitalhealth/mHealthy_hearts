const crypto = require("crypto");
const express = require("express");
const router = express.Router();
const db = require("../db.js");
const { verifyToken } = require("../auth.js");
const {
  getBloodGlucoseScore,
  getBMIScore,
  getDietScore,
  getNonHDLScore,
  getNicotineScore,
  getPhysicalActivityScore,
  getSleepScore,
} = require("../metricCalc.js");
const {
  getTimezoneFromRequest,
  getTodayInTimezone,
  subtractDaysLocal,
} = require("../utils/dateHelpers.js");

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Convert a MySQL DATE/DATETIME value to a YYYY-MM-DD string (UTC-safe)
function toYmd(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, "0");
    const d = String(val.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(val).slice(0, 10);
}

// From a list sorted ASC by dayField, return the last row where day <= targetDate
function mostRecentOnOrBefore(rows, dayField, targetDate) {
  let result = null;
  for (const row of rows) {
    const d = toYmd(row[dayField]);
    if (d && d <= targetDate) result = row;
    else if (d && d > targetDate) break;
  }
  return result;
}

// Fetch all historical assessment + Fitbit data for a user, going back fromDate
async function fetchAllHistory(userId, fromDate) {
  const [blRows] = await db.execute(
    `SELECT value, DATE(created_at) AS day
     FROM blood_lipids_assessments
     WHERE user_id = ? AND value IS NOT NULL
     ORDER BY created_at ASC`,
    [userId]
  );
  const [bsRows] = await db.execute(
    `SELECT value, test_type, has_diabetes, DATE(created_at) AS day
     FROM blood_sugar_assessments
     WHERE user_id = ? AND value IS NOT NULL
     ORDER BY created_at ASC`,
    [userId]
  );
  const [bmiRows] = await db.execute(
    `SELECT bmi_value, DATE(created_at) AS day
     FROM bmi_assessments
     WHERE user_id = ?
     ORDER BY created_at ASC`,
    [userId]
  );
  const [dietRows] = await db.execute(
    `SELECT *, DATE(created_at) AS day
     FROM diet_assessments
     WHERE user_id = ?
     ORDER BY created_at ASC`,
    [userId]
  );
  const [smokingRows] = await db.execute(
    `SELECT category, frequency, time_quit, second_hand_exposure, DATE(created_at) AS day
     FROM smoking_assessments
     WHERE user_id = ?
     ORDER BY created_at ASC`,
    [userId]
  );
  const [stepsRaw] = await db.execute(
    `SELECT steps, date
     FROM fitbit_daily_data
     WHERE user_id = ? AND date >= ?
     ORDER BY date ASC`,
    [userId, fromDate]
  );
  const [sleepRaw] = await db.execute(
    `SELECT total_minutes_asleep, date
     FROM fitbit_sleep_data
     WHERE user_id = ? AND date >= ?
     ORDER BY date ASC`,
    [userId, fromDate]
  );
  const [goalRaw] = await db.execute(
    `SELECT step_target, goal_date
     FROM daily_goals
     WHERE user_id = ? AND goal_date >= ?
     ORDER BY goal_date ASC`,
    [userId, fromDate]
  );

  // Build maps for O(1) lookup by date
  const stepsMap = {};
  for (const r of stepsRaw) {
    const d = toYmd(r.date);
    if (d) stepsMap[d] = r;
  }
  const sleepMap = {};
  for (const r of sleepRaw) {
    const d = toYmd(r.date);
    if (d) sleepMap[d] = r;
  }
  const goalMap = {};
  for (const r of goalRaw) {
    const d = toYmd(r.goal_date);
    if (d) goalMap[d] = Number(r.step_target);
  }

  return { blRows, bsRows, bmiRows, dietRows, smokingRows, stepsMap, sleepMap, goalMap };
}

// Compute the composite LE8 heart score for a specific date using the
// most-recent assessment values available on or before that date
function computeCompositeForDate(date, { blRows, bsRows, bmiRows, dietRows, smokingRows, stepsMap, sleepMap, goalMap }) {
  const scores = [];

  // Blood lipids (non-HDL)
  const bl = mostRecentOnOrBefore(blRows, "day", date);
  if (bl && bl.value != null) {
    const s = getNonHDLScore(Number(bl.value));
    if (s !== null) scores.push(s);
  }

  // Blood sugar
  const bs = mostRecentOnOrBefore(bsRows, "day", date);
  if (bs && bs.value != null) {
    const s = getBloodGlucoseScore({ testType: bs.test_type, value: Number(bs.value), hasDiabetes: bs.has_diabetes === 1 });
    if (s !== null) scores.push(s);
  }

  // BMI
  const bmi = mostRecentOnOrBefore(bmiRows, "day", date);
  if (bmi && bmi.bmi_value != null) {
    const s = getBMIScore(Number(bmi.bmi_value));
    if (s !== null) scores.push(s);
  }

  // Diet
  const diet = mostRecentOnOrBefore(dietRows, "day", date);
  if (diet) {
    const result = getDietScore(diet);
    if (result) scores.push(result.displayScore);
  }

  // Smoking
  const smoking = mostRecentOnOrBefore(smokingRows, "day", date);
  if (smoking) {
    const s = getNicotineScore({
      category: smoking.category,
      frequency: smoking.frequency,
      timeQuit: smoking.time_quit,
      secondHandExposure: smoking.second_hand_exposure,
    });
    if (s !== null) scores.push(s);
  }

  // Physical activity (today's steps)
  const stepsData = stepsMap[date];
  if (stepsData && stepsData.steps != null) {
    const goalSteps = goalMap[date] || 10000;
    const s = getPhysicalActivityScore(Number(stepsData.steps), goalSteps);
    if (s !== null) scores.push(s);
  }

  // Sleep (Fitbit stores it under the night's starting date; same date key as health-scores main endpoint)
  const prevDate = subtractDaysLocal(date, 1);
  const sleepData = sleepMap[prevDate];
  if (sleepData && sleepData.total_minutes_asleep != null) {
    const hours = Number(sleepData.total_minutes_asleep) / 60;
    const s = getSleepScore(hours);
    if (s !== null) scores.push(s);
  }

  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// Null-safe average of an array (ignores nulls)
function safeAvg(arr) {
  const valid = arr.filter((v) => v !== null && v !== undefined);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/health-scores
// Gets all health scores (blood lipids, blood sugar, BMI, diet, smoking) for the authenticated user
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get latest blood lipid value
    const [bloodLipidRows] = await db.execute(
      "SELECT value FROM blood_lipids_assessments WHERE user_id = ? AND value IS NOT NULL ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    let bloodLipidScore = null;
    let bloodLipidValue = null;
    if (bloodLipidRows && bloodLipidRows.length > 0 && bloodLipidRows[0].value !== null) {
      bloodLipidValue = Number(bloodLipidRows[0].value);
      bloodLipidScore = getNonHDLScore(bloodLipidValue);
    }

    // Get latest blood sugar value
    const [bloodSugarRows] = await db.execute(
      "SELECT value, test_type, has_diabetes FROM blood_sugar_assessments WHERE user_id = ? AND value IS NOT NULL ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    let bloodSugarScore = null;
    let bloodSugarValue = null;
    let bloodSugarTestType = null;
    if (bloodSugarRows && bloodSugarRows.length > 0 && bloodSugarRows[0].value !== null) {
      bloodSugarValue = Number(bloodSugarRows[0].value);
      bloodSugarTestType = bloodSugarRows[0].test_type;
      bloodSugarScore = getBloodGlucoseScore({ testType: bloodSugarTestType, value: bloodSugarValue, hasDiabetes: bloodSugarRows[0].has_diabetes === 1 });
    }

    // Get latest BMI value
    const [bmiRows] = await db.execute(
      "SELECT bmi_value FROM bmi_assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    let bmiScore = null;
    let bmiValue = null;
    if (bmiRows && bmiRows.length > 0) {
      bmiValue = Number(bmiRows[0].bmi_value);
      bmiScore = getBMIScore(bmiValue);
    }

    // Get latest diet assessment
    const [dietRows] = await db.execute(
      "SELECT * FROM diet_assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    let dietScore = null;
    let dietMepaScore = null;
    if (dietRows && dietRows.length > 0) {
      const dietResult = getDietScore(dietRows[0]);
      if (dietResult) {
        dietMepaScore = dietResult.mepaScore;
        dietScore = dietResult.displayScore;
      }
    }

    // Get latest smoking assessment
    const [smokingRows] = await db.execute(
      "SELECT * FROM smoking_assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    let smokingScore = null;
    let smokingCategory = null;
    if (smokingRows && smokingRows.length > 0) {
      smokingCategory = smokingRows[0].category;
      smokingScore = getNicotineScore({
        category: smokingRows[0].category,
        frequency: smokingRows[0].frequency,
        timeQuit: smokingRows[0].time_quit,
        secondHandExposure: smokingRows[0].second_hand_exposure,
      });
    }

    // Physical Activity — today's steps from fitbit_daily_data (same "today" as Fitbit routes when timezone is sent)
    const tz = getTimezoneFromRequest(req);
    const today = getTodayInTimezone(tz);
    const [activityRows] = await db.execute(
      "SELECT steps FROM fitbit_daily_data WHERE user_id = ? AND date = ? ORDER BY updated_at DESC LIMIT 1",
      [userId, today]
    );
    const [goalRows] = await db.execute(
      "SELECT step_target FROM daily_goals WHERE user_id = ? AND goal_date = ?",
      [userId, today]
    );
    let physicalActivityScore = null;
    let physicalActivitySteps = null;
    if (activityRows && activityRows.length > 0 && activityRows[0].steps != null) {
      physicalActivitySteps = Number(activityRows[0].steps);
      const goalSteps = goalRows && goalRows.length > 0 ? Number(goalRows[0].step_target) : 10000;
      physicalActivityScore = getPhysicalActivityScore(physicalActivitySteps, goalSteps);
    }

    // Sleep — yesterday's sleep from fitbit_sleep_data
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const [sleepDbRows] = await db.execute(
      "SELECT total_minutes_asleep FROM fitbit_sleep_data WHERE user_id = ? AND date = ? ORDER BY updated_at DESC LIMIT 1",
      [userId, yesterday]
    );
    let sleepScore = null;
    let sleepHours = null;
    if (sleepDbRows && sleepDbRows.length > 0 && sleepDbRows[0].total_minutes_asleep != null) {
      sleepHours = Number(sleepDbRows[0].total_minutes_asleep) / 60;
      sleepScore = getSleepScore(sleepHours);
    }

    // Calculate composite score (average of available scores)
    const scoreValues = [
      bloodLipidScore,
      bloodSugarScore,
      bmiScore,
      dietScore,
      smokingScore,
      physicalActivityScore,
      sleepScore
    ].filter(v => typeof v === 'number' && !isNaN(v));
    let compositeScore = null;
    if (scoreValues.length > 0) {
      compositeScore = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
      // Persist daily composite snapshot without breaking this endpoint if persistence fails.
      const scoreDate = new Date().toISOString().slice(0, 10);
      try {
        await db.execute(
          `INSERT INTO le8_composite_scores (id, user_id, composite_score, score_date, components_counted)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             composite_score = VALUES(composite_score),
             components_counted = VALUES(components_counted),
             updated_at = CURRENT_TIMESTAMP`,
          [crypto.randomUUID(), userId, compositeScore, scoreDate, scoreValues.length]
        );
      } catch (persistErr) {
        console.error("[GET /api/health-scores] Failed to persist composite score:", persistErr.message);
      }
    }
    return res.status(200).json({
      bloodLipids: {
        score: bloodLipidScore,
        value: bloodLipidValue,
      },
      bloodSugar: {
        score: bloodSugarScore,
        value: bloodSugarValue,
        testType: bloodSugarTestType,
      },
      bmi: {
        score: bmiScore,
        value: bmiValue,
      },
      diet: {
        score: dietScore,
        mepaScore: dietMepaScore, // Raw MEPA score (0-10)
      },
      smoking: {
        score: smokingScore,
        category: smokingCategory,
      },
      physicalActivity: {
        score: physicalActivityScore,
        steps: physicalActivitySteps,
      },
      sleep: {
        score: sleepScore,
        hours: sleepHours,
      },
      compositeScore,
    });
  } catch (error) {
    console.error("[GET /api/health-scores] Error:", error);
    console.error("[GET /api/health-scores] Error stack:", error.stack);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

// GET /api/health-scores/stats
// Returns the current composite heart score, 7-day average, month-to-date average,
// year-to-date average, and a trend vs 7-day average
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const tz = getTimezoneFromRequest(req) || "UTC";
    const today = getTodayInTimezone(tz);

    // Fetch 336 days of history in one pass — enough for all three averages
    const fromDate = subtractDaysLocal(today, 335);
    const histData = await fetchAllHistory(userId, fromDate);

    // Build daily scores oldest → newest (336 entries, index 335 = today)
    const dailyScores = [];
    for (let i = 335; i >= 0; i--) {
      dailyScores.push(computeCompositeForDate(subtractDaysLocal(today, i), histData));
    }

    const current         = dailyScores[335]; // today
    const sevenDayAverage = safeAvg(dailyScores.slice(329)); // last 7 days
    const monthAverage    = safeAvg(dailyScores.slice(308)); // last 28 days
    const yearAverage     = safeAvg(dailyScores);            // last 336 days

    let trend = null;
    if (current !== null && sevenDayAverage !== null) {
      if (current > sevenDayAverage) {
        trend = { arrow: "↑", text: "Higher than 7-day avg" };
      } else if (current < sevenDayAverage) {
        trend = { arrow: "↓", text: "Lower than 7-day avg" };
      } else {
        trend = { arrow: "–", text: "Equal to 7-day avg" };
      }
    }

    return res.status(200).json({ current, sevenDayAverage, monthAverage, yearAverage, trend });
  } catch (error) {
    console.error("[GET /api/health-scores/stats] Error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// GET /api/health-scores/history?period=week|month|year
// Returns bar chart data for the composite heart score over time
router.get("/history", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const period = req.query.period || "week";
    const tz = getTimezoneFromRequest(req) || "UTC";
    const today = getTodayInTimezone(tz);

    // Number of days to look back
    const daysCount = period === "week" ? 7 : period === "month" ? 28 : 336;
    const fromDate = subtractDaysLocal(today, daysCount - 1);

    const histData = await fetchAllHistory(userId, fromDate);

    // Build sorted array of dates oldest → newest
    const dates = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      dates.push(subtractDaysLocal(today, i));
    }

    // Compute composite for every day in the range
    const dailyScores = dates.map((date) => computeCompositeForDate(date, histData));

    // Aggregate into bars by period
    let bars = [];
    if (period === "week") {
      // 7 bars, one per day
      bars = dailyScores.map((score) => ({ score }));
    } else if (period === "month") {
      // 4 bars, one per 7-day week
      for (let w = 0; w < 4; w++) {
        bars.push({ score: safeAvg(dailyScores.slice(w * 7, w * 7 + 7)) });
      }
    } else {
      // year: 6 bars, one per ~56-day period (≈ 2 months)
      for (let b = 0; b < 6; b++) {
        bars.push({ score: safeAvg(dailyScores.slice(b * 56, b * 56 + 56)) });
      }
    }

    return res.status(200).json({ bars });
  } catch (error) {
    console.error("[GET /api/health-scores/history] Error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// GET /api/health-scores/physical-activity/history?period=week|month|year
// Returns bar chart data for physical activity scores over time
router.get("/physical-activity/history", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const period = req.query.period || "week";
    const tz = getTimezoneFromRequest(req) || "UTC";
    const today = getTodayInTimezone(tz);

    const daysCount = period === "week" ? 7 : period === "month" ? 28 : 336;
    const fromDate = subtractDaysLocal(today, daysCount - 1);

    const [stepsRows] = await db.execute(
      `SELECT steps, date FROM fitbit_daily_data
       WHERE user_id = ? AND date >= ? AND date <= ?
       ORDER BY date ASC`,
      [userId, fromDate, today]
    );
    const [goalRows] = await db.execute(
      `SELECT step_target, goal_date FROM daily_goals
       WHERE user_id = ? AND goal_date >= ? AND goal_date <= ?
       ORDER BY goal_date ASC`,
      [userId, fromDate, today]
    );

    const stepsMap = {};
    for (const r of stepsRows) {
      const d = toYmd(r.date);
      if (d) stepsMap[d] = Number(r.steps);
    }
    const goalMap = {};
    for (const r of goalRows) {
      const d = toYmd(r.goal_date);
      if (d) goalMap[d] = Number(r.step_target);
    }

    const dates = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      dates.push(subtractDaysLocal(today, i));
    }

    const dailyScores = dates.map((date) => {
      const steps = stepsMap[date];
      if (steps == null) return null;
      const goal = goalMap[date] || 10000;
      return getPhysicalActivityScore(steps, goal);
    });

    let bars = [];
    if (period === "week") {
      bars = dailyScores.map((score) => ({ score }));
    } else if (period === "month") {
      for (let w = 0; w < 4; w++) {
        bars.push({ score: safeAvg(dailyScores.slice(w * 7, w * 7 + 7)) });
      }
    } else {
      for (let b = 0; b < 6; b++) {
        bars.push({ score: safeAvg(dailyScores.slice(b * 56, b * 56 + 56)) });
      }
    }

    return res.status(200).json({ bars });
  } catch (error) {
    console.error("[GET /api/health-scores/physical-activity/history] Error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// GET /api/health-scores/sleep/history?period=week|month|year
// Returns bar chart data for sleep scores over time
router.get("/sleep/history", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const period = req.query.period || "week";
    const tz = getTimezoneFromRequest(req) || "UTC";
    const today = getTodayInTimezone(tz);

    const daysCount = period === "week" ? 7 : period === "month" ? 28 : 336;
    const fromDate = subtractDaysLocal(today, daysCount - 1);

    const [sleepRows] = await db.execute(
      `SELECT total_minutes_asleep, date FROM fitbit_sleep_data
       WHERE user_id = ? AND date >= ? AND date <= ?
       ORDER BY date ASC`,
      [userId, fromDate, today]
    );

    const sleepMap = {};
    for (const r of sleepRows) {
      const d = toYmd(r.date);
      if (d) sleepMap[d] = Number(r.total_minutes_asleep);
    }

    const dates = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      dates.push(subtractDaysLocal(today, i));
    }

    const dailyScores = dates.map((date) => {
      const minutes = sleepMap[date];
      if (minutes == null) return null;
      return getSleepScore(minutes / 60);
    });

    let bars = [];
    if (period === "week") {
      bars = dailyScores.map((score) => ({ score }));
    } else if (period === "month") {
      for (let w = 0; w < 4; w++) {
        bars.push({ score: safeAvg(dailyScores.slice(w * 7, w * 7 + 7)) });
      }
    } else {
      for (let b = 0; b < 6; b++) {
        bars.push({ score: safeAvg(dailyScores.slice(b * 56, b * 56 + 56)) });
      }
    }

    return res.status(200).json({ bars });
  } catch (error) {
    console.error("[GET /api/health-scores/sleep/history] Error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = { router };
