const express = require("express");
const router = express.Router();
const db = require("../db.js");
const { verifyToken } = require("../auth.js");

// Helper function to calculate smoking score (same logic as in healthScores.js)
function calculateSmokingScore(category, frequency, timeQuit) {
  // Never smokers: score 100
  if (category === 'never') {
    return 100;
  }

  // Former smokers: score based on time since quitting
  if (category === 'former') {
    if (timeQuit === '5+') {
      return 100;
    } else if (timeQuit === '1+') {
      return 75;
    } else {
      // '<1' or any other value (including null)
      return 50;
    }
  }

  // Current smokers: score based on frequency
  if (category === 'current') {
    if (frequency === 'rarely') {
      return 25;
    } else {
      // 'somedays' or 'everyday' or any other value (including null)
      return 0;
    }
  }

  return 0; // Default fallback
}

// POST /api/smoking
// Stores the user's smoking assessment with calculated score
router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const { category, frequency, timeQuit, interestInQuitting } = req.body || {};

    if (!category) {
      return res.status(400).json({ message: "category is required" });
    }

    // Validate category
    if (!['current', 'former', 'never'].includes(category)) {
      return res.status(400).json({ message: "category must be 'current', 'former', or 'never'" });
    }

    // Calculate the smoking score based on the data
    const score = calculateSmokingScore(category, frequency, timeQuit);

    await db.execute(
      `INSERT INTO smoking_assessments (
        user_id,
        category,
        frequency,
        time_quit,
        interest_in_quitting,
        score
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        category,
        frequency || null,
        timeQuit || null,
        interestInQuitting || null,
        score,
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

module.exports = { router };

