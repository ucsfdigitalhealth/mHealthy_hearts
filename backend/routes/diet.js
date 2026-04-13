const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const db = require("../db.js");
const { verifyToken } = require("../auth.js");
const { getDietScore } = require("../metricCalc.js");

/**
 * Calendar YYYY-MM-DD for comparisons with toLocaleDateString('en-CA', { timeZone }).
 * mysql2 returns SQL DATE as a JS Date; String(date) is locale-based, so split('-') breaks.
 */
function toClientYmd(day, timeZone) {
  if (day == null || day === "") return null;
  if (day instanceof Date && !isNaN(day.getTime())) {
    return day.toLocaleDateString("en-CA", { timeZone });
  }
  const s = String(day).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

// POST /api/diet
// Stores the user's diet assessment
router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const {
      vegetablesPerDay,
      fruitPerDay,
      redMeatPerWeek,
      fishPerWeek,
      butterPerWeek,
      beansPerWeek,
      wholeGrainsPerDay,
      sweetsPerWeek,
      fastFoodPerWeek,
      sugaryDrinksPerWeek,
      commitmentToChange,
      importance,
      confidence,
    } = req.body || {};

    const numericValue = (val) => {
      if (val === undefined || val === null || val === "") return null;
      const num = Number(val);
      return Number.isNaN(num) ? null : num;
    };

    const dataId = crypto.randomUUID();
    const commitBool = commitmentToChange === true || commitmentToChange === 1 ? 1 : 0;
    const importanceVal = commitBool ? numericValue(importance) : null;
    const confidenceVal = commitBool ? numericValue(confidence) : null;

    const dietData = {
      vegetables_per_day: numericValue(vegetablesPerDay),
      fruit_per_day: numericValue(fruitPerDay),
      red_meat_per_week: numericValue(redMeatPerWeek),
      fish_per_week: numericValue(fishPerWeek),
      butter_per_week: numericValue(butterPerWeek),
      beans_per_week: numericValue(beansPerWeek),
      whole_grains_per_day: numericValue(wholeGrainsPerDay),
      sweets_per_week: numericValue(sweetsPerWeek),
      fast_food_per_week: numericValue(fastFoodPerWeek),
      sugary_drinks_per_week: numericValue(sugaryDrinksPerWeek),
    };

    const scoreResult = getDietScore(dietData);
    const computedScore = scoreResult?.displayScore ?? null;

    // Determine today's UTC boundaries using the client timezone if provided
    const tz = req.body.timezone || req.headers['x-timezone'] || 'UTC';
    const now = new Date();
    const localNow = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const offsetMs = now.getTime() - localNow.getTime();
    const todayStart = new Date(new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate(), 0, 0, 0).getTime() + offsetMs);
    const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const todayStartStr = todayStart.toISOString().slice(0, 19).replace('T', ' ');
    const todayEndStr   = todayEnd.toISOString().slice(0, 19).replace('T', ' ');

    // Check for an existing record for this user today
    const [existing] = await db.execute(
      `SELECT data_id FROM diet_assessments
       WHERE user_id = ? AND created_at >= ? AND created_at < ?
       ORDER BY created_at DESC LIMIT 1`,
      [userId, todayStartStr, todayEndStr]
    );

    const fields = [
      dietData.vegetables_per_day, dietData.fruit_per_day, dietData.red_meat_per_week,
      dietData.fish_per_week, dietData.butter_per_week, dietData.beans_per_week,
      dietData.whole_grains_per_day, dietData.sweets_per_week, dietData.fast_food_per_week,
      dietData.sugary_drinks_per_week, commitBool, importanceVal, confidenceVal, computedScore,
    ];

    if (existing.length > 0) {
      // Update the existing row for today
      await db.execute(
        `UPDATE diet_assessments SET
          vegetables_per_day = ?, fruit_per_day = ?, red_meat_per_week = ?, fish_per_week = ?,
          butter_per_week = ?, beans_per_week = ?, whole_grains_per_day = ?, sweets_per_week = ?,
          fast_food_per_week = ?, sugary_drinks_per_week = ?,
          commitment_to_change = ?, importance = ?, confidence = ?, score = ?
         WHERE data_id = ?`,
        [...fields, existing[0].data_id]
      );
    } else {
      // Insert a new row
      await db.execute(
        `INSERT INTO diet_assessments (
          data_id, user_id,
          vegetables_per_day, fruit_per_day, red_meat_per_week, fish_per_week,
          butter_per_week, beans_per_week, whole_grains_per_day, sweets_per_week,
          fast_food_per_week, sugary_drinks_per_week,
          commitment_to_change, importance, confidence, score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [dataId, userId, ...fields]
      );
    }

    // Write daily score to daily_scores table
    const scoreDate = new Date().toISOString().slice(0, 10);
    if (scoreResult?.displayScore != null) {
      await db.execute(
        'INSERT INTO daily_scores (user_id, score_type, score_value, score_date) VALUES (?, ?, ?, ?)',
        [userId, 'diet', scoreResult.displayScore, scoreDate]
      );
    }
    return res.status(201).json({
      success: true,
      message: "Diet assessment saved successfully",
      score: computedScore,
      mepaScore: scoreResult?.mepaScore ?? null,
    });
  } catch (error) {
    console.error("Error saving diet assessment:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

// GET /api/diet/today
// Returns the most recent diet assessment for today, or zeros if none exists
router.get("/today", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Calculate UTC boundaries of "today" in the client's timezone in Node.js
    // to avoid relying on MySQL CONVERT_TZ (requires timezone tables to be loaded).
    const tz = req.query.timezone || req.headers['x-timezone'] || 'UTC';
    let startUtc, endUtc;
    try {
      const now = new Date();
      // Get today's date string in the client's timezone (e.g. "2026-04-12")
      const todayStr = now.toLocaleDateString('en-CA', { timeZone: tz }); // "YYYY-MM-DD"
      // Parse that as midnight and end-of-day in UTC
      startUtc = new Date(`${todayStr}T00:00:00`);
      // Shift by the timezone offset to get UTC midnight in client tz
      const offsetMs = now.getTime() - new Date(now.toLocaleString('en-US', { timeZone: tz })).getTime();
      startUtc = new Date(new Date(`${todayStr}T00:00:00`).getTime() + offsetMs);
      endUtc   = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
    } catch {
      // Fallback: UTC day boundaries
      const now = new Date();
      startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      endUtc   = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
    }

    const startStr = startUtc.toISOString().slice(0, 19).replace('T', ' ');
    const endStr   = endUtc.toISOString().slice(0, 19).replace('T', ' ');

    const [rows] = await db.execute(
      `SELECT
         vegetables_per_day,
         fruit_per_day,
         red_meat_per_week,
         fish_per_week,
         butter_per_week,
         beans_per_week,
         whole_grains_per_day,
         sweets_per_week,
         fast_food_per_week,
         sugary_drinks_per_week
       FROM diet_assessments
       WHERE user_id = ?
         AND created_at >= ?
         AND created_at < ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, startStr, endStr]
    );

    const data = rows.length > 0 ? rows[0] : {};

    return res.status(200).json({
      vegetables:   data.vegetables_per_day    ?? 0,
      fruits:       data.fruit_per_day         ?? 0,
      redMeat:      data.red_meat_per_week     ?? 0,
      fish:         data.fish_per_week         ?? 0,
      butter:       data.butter_per_week       ?? 0,
      beans:        data.beans_per_week        ?? 0,
      grains:       data.whole_grains_per_day  ?? 0,
      sweets:       data.sweets_per_week       ?? 0,
      fastFood:     data.fast_food_per_week    ?? 0,
      sugaryDrinks: data.sugary_drinks_per_week ?? 0,
      hasData:      rows.length > 0,
    });
  } catch (error) {
    console.error("[GET /api/diet/today] Error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// GET /api/diet/history
// Returns bar chart data for week/month/year-to-date diet scores
router.get("/history", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const period = req.query.period || 'week';
    // Must be a fixed int — MySQL prepared statements reject LIMIT ? (ER_WRONG_ARGUMENTS).
    const limit =
      period === 'week' ? 7 : period === 'month' ? 28 : 336;

    const [rows] = await db.execute(
      `SELECT score, DATE(created_at) as day
       FROM diet_assessments
       WHERE user_id = ? AND score IS NOT NULL
       ORDER BY created_at DESC
       LIMIT ${limit}`,
      [userId]
    );

    // Rows come back newest-first, reverse so oldest→newest
    rows.reverse();

    const avg = (arr) =>
      arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

    const scores = rows.map(r => Number(r.score));

    let bars = [];

    if (period === 'week') {
      // Determine client timezone (from query or header), fallback to 'UTC'
      const tz = req.query.timezone || req.headers['x-timezone'] || 'UTC';
      
      // Get today's date in the user's local timezone
      const now = new Date();
      const todayLocalStr = now.toLocaleDateString("en-CA", { timeZone: tz }); // 'YYYY-MM-DD'

      let hasToday = false;
      if (rows.length > 0 && rows[rows.length - 1].day != null) {
        const lastDayKey = toClientYmd(rows[rows.length - 1].day, tz);
        hasToday = lastDayKey != null && lastDayKey === todayLocalStr;
      }

      console.log("[GET /api/diet/history] hasToday:", hasToday, {
        todayLocal: todayLocalStr,
        lastRowDayRaw: rows.length > 0 ? rows[rows.length - 1].day : null,
        lastDayKey:
          rows.length > 0
            ? toClientYmd(rows[rows.length - 1].day, tz)
            : null,
        tz,
      });

      // Up to 6 past days + today
      for (let i = 0; i < 6; i++) {
        bars.push({ score: scores[i] ?? null });
      }
      bars.push({ score: hasToday ? scores[6] ?? null : null });

    } else if (period === 'month') {
      // 4 buckets of 7 rows each
      for (let w = 0; w < 4; w++) {
        const slice = scores.slice(w * 7, w * 7 + 7);
        bars.push({ score: avg(slice) });
      }

    } else {
      // 6 buckets of 56 rows each
      for (let b = 0; b < 6; b++) {
        const slice = scores.slice(b * 56, b * 56 + 56);
        bars.push({ score: avg(slice) });
      }
    }

    return res.status(200).json({ bars });
  } catch (error) {
    console.error("[GET /api/diet/history] Error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = { router };