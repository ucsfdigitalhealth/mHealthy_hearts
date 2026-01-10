const express = require("express");
const router = express.Router();
const db = require("../db.js");
const { verifyToken } = require("../auth.js");

// POST /api/bmi
// Stores the user's BMI assessment
router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const { bmiValue, weight, height } = req.body || {};

    if (!bmiValue) {
      return res.status(400).json({ message: "bmiValue is required" });
    }

    const numericBMI = Number(bmiValue);
    if (Number.isNaN(numericBMI)) {
      return res
        .status(400)
        .json({ message: "bmiValue must be a number" });
    }

    const numericWeight = weight ? Number(weight) : null;
    const numericHeight = height ? Number(height) : null;

    if (numericWeight !== null && Number.isNaN(numericWeight)) {
      return res
        .status(400)
        .json({ message: "weight must be a number if provided" });
    }

    if (numericHeight !== null && Number.isNaN(numericHeight)) {
      return res
        .status(400)
        .json({ message: "height must be a number if provided" });
    }

    await db.execute(
      "INSERT INTO bmi_assessments (user_id, bmi_value, weight, height) VALUES (?, ?, ?, ?)",
      [userId, numericBMI, numericWeight, numericHeight]
    );

    return res.status(201).json({
      success: true,
      message: "BMI assessment saved successfully",
    });
  } catch (error) {
    console.error("Error saving BMI assessment:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

module.exports = { router };
