const express = require("express");
const router = express.Router();
const db = require("../db.js");
const { verifyToken } = require("../auth.js");

// POST /api/blood-lipids
// Stores the user's blood lipids selection (measure type + value)
router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const { measureType, value } = req.body || {};

    if (!measureType) {
      return res.status(400).json({ message: "measureType is required" });
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

    // NOTE: You must ensure this table exists in your MySQL database.
    // See README.md for the complete SQL schema.
    // The user_id should match the type of user_auth_testing.id (INT)
    await db.execute(
      "INSERT INTO blood_lipids_assessments (user_id, measure_type, value) VALUES (?, ?, ?)",
      [userId, measureType, numericValue]
    );

    return res.status(201).json({
      success: true,
      message: "Blood lipids selection saved successfully",
    });
  } catch (error) {
    console.error("Error saving blood lipids selection:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

// GET /api/blood-lipids/score
// Gets the blood lipid score and value for the authenticated user
router.get("/score", verifyToken, async (req, res) => {
  try {
    console.log("[GET /api/blood-lipids/score] Route hit");
    const userId = req.user?.userId || null;
    console.log("[GET /api/blood-lipids/score] userId:", userId);

    if (!userId) {
      console.log("[GET /api/blood-lipids/score] No userId, returning 401");
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get the latest blood lipid value for the user (where value is not null)
    // Note: user_id should match the type of user_auth_testing.id (VARCHAR(36))
    console.log("[GET /api/blood-lipids/score] Querying database for userId:", userId);
    const [rows] = await db.execute(
      "SELECT value FROM blood_lipids_assessments WHERE user_id = ? AND value IS NOT NULL ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    console.log("[GET /api/blood-lipids/score] Query result:", rows);

    // If no value found, return null
    if (!rows || rows.length === 0 || rows[0].value === null) {
      return res.status(200).json({ score: null, value: null });
    }

    const value = Number(rows[0].value);

    // Calculate score based on the value
    let score;
    if (value < 130) {
      score = 100;
    } else if (value >= 130 && value <= 159) {
      score = 60;
    } else if (value >= 160 && value <= 189) {
      score = 40;
    } else if (value >= 190 && value <= 219) {
      score = 20;
    } else {
      // value >= 220
      score = 0;
    }

    console.log("[GET /api/blood-lipids/score] Returning score:", score, "value:", value);
    return res.status(200).json({ score, value });
  } catch (error) {
    console.error("[GET /api/blood-lipids/score] Error:", error);
    console.error("[GET /api/blood-lipids/score] Error stack:", error.stack);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

module.exports = { router };


