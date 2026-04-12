const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const db = require("../db.js");
const { verifyToken } = require("../auth.js");
const { getNicotineScore } = require("../metricCalc.js");

// POST /api/smoking
// Stores the user's full smoking assessment with calculated score
router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const {
      category,
      frequency,
      productType,
      timeQuit,
      interestInQuitting,
      secondHandExposure,
      commitmentToChange,
      importance,
      confidence,
    } = req.body || {};

    if (!category) {
      return res.status(400).json({ message: "category is required" });
    }

    if (!["current", "former", "never"].includes(category)) {
      return res
        .status(400)
        .json({ message: "category must be 'current', 'former', or 'never'" });
    }

    const secondHandBool =
      secondHandExposure === true ||
      secondHandExposure === "true" ||
      secondHandExposure === 1
        ? 1
        : secondHandExposure === false ||
          secondHandExposure === "false" ||
          secondHandExposure === 0
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

    const score = getNicotineScore({
      category,
      frequency: frequency || null,
      timeQuit: timeQuit || null,
      secondHandExposure: secondHandBool,
    });

    // Only store importance/confidence when user committed to change
    const importanceVal =
      commitBool === 1 && importance != null ? Number(importance) : null;
    const confidenceVal =
      commitBool === 1 && confidence != null ? Number(confidence) : null;

    const dataId = crypto.randomUUID();

    await db.execute(
      `INSERT INTO smoking_assessments (
        data_id,
        user_id,
        category,
        frequency,
        type_smoker,
        time_quit,
        interest_in_quitting,
        score,
        second_hand_exposure,
        commitment_to_change,
        importance,
        confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dataId,
        userId,
        category,
        frequency || null,
        productType || null,
        timeQuit || null,
        interestInQuitting || null,
        score,
        secondHandBool,
        commitBool,
        importanceVal,
        confidenceVal,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Smoking assessment saved successfully",
    });
  } catch (error) {
    console.error("Error saving smoking assessment:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

// GET /api/smoking/score
// Returns the smoking score and category for the authenticated user
router.get("/score", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [rows] = await db.execute(
      "SELECT category, frequency, time_quit, second_hand_exposure FROM smoking_assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(200).json({ score: null, category: null });
    }

    const { category, frequency, time_quit, second_hand_exposure } = rows[0];
    const score = getNicotineScore({
      category,
      frequency,
      timeQuit: time_quit,
      secondHandExposure: second_hand_exposure,
    });

    return res.status(200).json({ score, category });
  } catch (error) {
    console.error("[GET /api/smoking/score] Error:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

// GET /api/smoking/stats
// Returns the most recent record, last 3 records with scores, and their average score
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const [rows] = await db.execute(
      `SELECT category, score, created_at
       FROM smoking_assessments
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 3`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(200).json({ mostRecent: null, recentRecords: [], average: null });
    }

    const recentRecords = rows.map(r => ({
      category: r.category,
      score: Number(r.score),
      date: r.created_at,
    }));

    const mostRecent = recentRecords[0];

    const average =
      recentRecords.reduce((sum, r) => sum + r.score, 0) / recentRecords.length;

    return res.status(200).json({
      mostRecent,
      recentRecords,
      average: Math.round(average * 10) / 10,
    });
  } catch (error) {
    console.error("[GET /api/smoking/stats] Error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = { router };
