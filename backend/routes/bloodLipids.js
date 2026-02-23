const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const db = require("../db.js");
const { verifyToken } = require("../auth.js");
const { getNonHDLScore } = require("../metricCalc.js");

// POST /api/blood-lipids
// Stores the user's full blood lipids assessment
router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const {
      measureType,
      value,
      medication,
      commitmentToChange,
      importance,
      confidence,
    } = req.body || {};

    if (!measureType) {
      return res.status(400).json({ message: "measureType is required" });
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

    const medicationBool =
      medication === true || medication === "true" || medication === 1
        ? 1
        : medication === false || medication === "false" || medication === 0
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

    // Only store importance/confidence when user committed to change
    const importanceVal = commitBool === 1 && importance != null ? Number(importance) : null;
    const confidenceVal = commitBool === 1 && confidence != null ? Number(confidence) : null;

    const dataId = crypto.randomUUID();

    await db.execute(
      `INSERT INTO blood_lipids_assessments
        (data_id, user_id, measure_type, value, medication, commitment_to_change, importance, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [dataId, userId, measureType, numericValue, medicationBool, commitBool, importanceVal, confidenceVal]
    );

    return res.status(201).json({
      success: true,
      message: "Blood lipids assessment saved successfully",
    });
  } catch (error) {
    console.error("Error saving blood lipids assessment:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

// GET /api/blood-lipids/score
// Returns the blood lipid score and value for the authenticated user
router.get("/score", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [rows] = await db.execute(
      "SELECT value FROM blood_lipids_assessments WHERE user_id = ? AND value IS NOT NULL ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    if (!rows || rows.length === 0 || rows[0].value === null) {
      return res.status(200).json({ score: null, value: null });
    }

    const value = Number(rows[0].value);
    const score = getNonHDLScore(value);

    return res.status(200).json({ score, value });
  } catch (error) {
    console.error("[GET /api/blood-lipids/score] Error:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

module.exports = { router };
