const express = require("express");
const router = express.Router();
const db = require("../db.js");
const { verifyToken } = require("../auth.js");

// POST /api/blood-sugar
// Stores the user's blood sugar assessment (test type + value)
router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const { testType, value } = req.body || {};

    if (!testType) {
      return res.status(400).json({ message: "testType is required" });
    }

    // value is optional if user has no results
    const numericValue =
      value === undefined || value === null || value === ""
        ? null
        : Number(value);

    if (numericValue !== null && Number.isNaN(numericValue)) {
      return res
        .status(400)
        .json({ message: "value must be a number if provided" });
    }

    await db.execute(
      "INSERT INTO blood_sugar_assessments (user_id, test_type, value) VALUES (?, ?, ?)",
      [userId, testType, numericValue]
    );

    return res.status(201).json({
      success: true,
      message: "Blood sugar assessment saved successfully",
    });
  } catch (error) {
    console.error("Error saving blood sugar assessment:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

module.exports = { router };
