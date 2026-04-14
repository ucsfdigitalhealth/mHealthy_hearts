const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const db = require("../db.js");
const { verifyToken } = require("../auth.js");
const { getBMIScore } = require("../metricCalc.js");

// POST /api/bmi
// Stores the user's BMI assessment.
// Accepts either a direct bmiValue, or weight+height to calculate it.
router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const {
      bmiValue,
      weight,
      height,
      previousBmi,
      commitmentToChange,
      importance,
      confidence,
    } = req.body || {};

    const numericWeight =
      weight != null && weight !== "" ? Number(weight) : null;
    const numericHeight =
      height != null && height !== "" ? Number(height) : null;

    let numericBmi = null;

    if (bmiValue != null && bmiValue !== "") {
      // User knows their BMI and entered it directly
      numericBmi = Number(bmiValue);
    } else if (
      numericWeight !== null &&
      numericHeight !== null &&
      numericHeight > 0
    ) {
      // Calculate from imperial measurements: (703 * lbs) / (in²)
      numericBmi =
        (703 * numericWeight) / (numericHeight * numericHeight);
    }

    if (numericBmi === null || isNaN(numericBmi)) {
      return res.status(400).json({
        message: "Either bmiValue or both weight and height are required",
      });
    }

    numericBmi = Math.round(numericBmi * 10) / 10;

    const numericPrevBmi =
      previousBmi != null && previousBmi !== ""
        ? Number(previousBmi)
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

    // Only persist importance/confidence when user committed to change
    const importanceVal =
      commitBool === 1 ? Number(importance) || null : null;
    const confidenceVal =
      commitBool === 1 ? Number(confidence) || null : null;

    const dataId = crypto.randomUUID();

    await db.execute(
      `INSERT INTO bmi_assessments
        (data_id, user_id, bmi_value, weight, height, previous_bmi,
         commitment_to_change, importance, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dataId,
        userId,
        numericBmi,
        numericWeight,
        numericHeight,
        numericPrevBmi,
        commitBool,
        importanceVal,
        confidenceVal,
      ]
    );

    const score = getBMIScore(numericBmi);

    // Write daily score to daily_scores table
    const scoreDate = new Date().toISOString().slice(0, 10);
    if (userId && score !== null) {
      await db.execute(
        'INSERT INTO daily_scores (user_id, score_type, score_value, score_date) VALUES (?, ?, ?, ?)',
        [userId, 'bmi', score, scoreDate]
      );
    }

    return res.status(201).json({
      success: true,
      message: "BMI assessment saved successfully",
      bmiValue: numericBmi,
      score,
    });
  } catch (error) {
    console.error("Error saving BMI assessment:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

// GET /api/bmi/score
// Returns the latest BMI score and value for the authenticated user
router.get("/score", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;

    const [rows] = await db.execute(
      `SELECT bmi_value FROM bmi_assessments
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(200).json({ score: null, value: null });
    }

    const value = Number(rows[0].bmi_value);
    const score = getBMIScore(value);

    return res.status(200).json({ score, value });
  } catch (error) {
    console.error("Error fetching BMI score:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

// GET /api/bmi/stats
// Returns mostRecent, recentRecords (last 5), and average BMI score for the authenticated user
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;

    const [rows] = await db.execute(
      `SELECT bmi_value, created_at FROM bmi_assessments
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(200).json({ mostRecent: null, recentRecords: [], average: null });
    }

    const records = rows.map(row => ({
      value: Number(row.bmi_value),
      score: getBMIScore(Number(row.bmi_value)),
      date: row.created_at,
    }));

    const average = records.reduce((sum, r) => sum + r.value, 0) / records.length;

    return res.status(200).json({
      mostRecent: records[0],
      recentRecords: records,
      average: Math.round(average * 10) / 10,
    });
  } catch (error) {
    console.error("Error fetching BMI stats:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = { router };
