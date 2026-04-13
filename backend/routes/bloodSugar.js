const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const db = require("../db.js");
const { verifyToken } = require("../auth.js");
const { getBloodGlucoseScore } = require("../metricCalc.js");

// POST /api/blood-sugar
// Stores the user's full blood sugar assessment
router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const {
      testType,
      value,
      hasDiabetes,
      commitmentToChange,
      importance,
      confidence,
    } = req.body || {};

    if (!testType) {
      return res.status(400).json({ message: "testType is required" });
    }

    const numericValue =
      value === undefined || value === null || value === ""
        ? null
        : Number(value);

    if (numericValue !== null && Number.isNaN(numericValue)) {
      return res
        .status(400)
        .json({ message: "value must be a number if provided" });
    }

    const hasDiabetesBool =
      hasDiabetes === true || hasDiabetes === "true" || hasDiabetes === 1
        ? 1
        : hasDiabetes === false || hasDiabetes === "false" || hasDiabetes === 0
        ? 0
        : null;

    const commitBool =
      commitmentToChange === true ||
      commitmentToChange === "true" ||
      commitmentToChange === 1
        ? 1
        : commitmentToChange === false ||
          commitmentToChange === "false" ||
          commitmentToChange === 0
        ? 0
        : null;

    // Only persist importance/confidence if user committed to change
    const importanceVal = commitBool === 1 ? (Number(importance) || null) : null;
    const confidenceVal = commitBool === 1 ? (Number(confidence) || null) : null;

    const dataId = crypto.randomUUID();

    await db.execute(
      `INSERT INTO blood_sugar_assessments
        (data_id, user_id, test_type, value, has_diabetes, commitment_to_change, importance, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [dataId, userId, testType, numericValue, hasDiabetesBool, commitBool, importanceVal, confidenceVal]
    );

    const score = getBloodGlucoseScore({ testType, value: numericValue });

    // Write daily score to daily_scores table
    const scoreDate = new Date().toISOString().slice(0, 10);
    if (userId && score !== null) {
      await db.execute(
        'INSERT INTO daily_scores (user_id, score_type, score_value, score_date) VALUES (?, ?, ?, ?)',
        [userId, 'blood_sugar', score, scoreDate]
      );
    }

    return res.status(201).json({
      success: true,
      message: "Blood sugar assessment saved successfully",
      score,
    });
  } catch (error) {
    console.error("Error saving blood sugar assessment:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

// GET /api/blood-sugar/score
// Returns the latest blood sugar score and value for the authenticated user
router.get("/score", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;

    const [rows] = await db.execute(
      `SELECT test_type, value FROM blood_sugar_assessments
       WHERE user_id = ? AND value IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(200).json({ score: null, value: null, testType: null });
    }

    const { test_type: testType, value } = rows[0];
    const score = getBloodGlucoseScore({ testType, value: Number(value) });

    return res.status(200).json({ score, value: Number(value), testType });
  } catch (error) {
    console.error("Error fetching blood sugar score:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

// GET /api/blood-sugar/stats
// Returns the most recent record, last 3 records with scores, and their average score
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const [rows] = await db.execute(
      `SELECT test_type, value, created_at
       FROM blood_sugar_assessments
       WHERE user_id = ? AND value IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 3`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(200).json({ mostRecent: null, recentRecords: [], average: null });
    }

    const recentRecords = rows.map(r => ({
      testType: r.test_type,
      value: Number(r.value),
      score: getBloodGlucoseScore({ testType: r.test_type, value: Number(r.value) }),
      date: r.created_at,
    }));

    const mostRecent = recentRecords[0];

    const scoredRecords = recentRecords.filter(r => r.score !== null);
    const average = scoredRecords.length > 0
      ? Math.round((scoredRecords.reduce((sum, r) => sum + r.score, 0) / scoredRecords.length) * 10) / 10
      : null;

    return res.status(200).json({ mostRecent, recentRecords, average });
  } catch (error) {
    console.error("[GET /api/blood-sugar/stats] Error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = { router };
