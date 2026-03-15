const express = require("express");
const router = express.Router();
const db = require("../db.js");
const { verifyToken } = require("../auth.js");
const { getDietScore } = require("../metricCalc.js");

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

    await db.execute(
      `INSERT INTO diet_assessments (
        data_id, user_id,
        vegetables_per_day, fruit_per_day, red_meat_per_week, fish_per_week,
        butter_per_week, beans_per_week, whole_grains_per_day, sweets_per_week,
        fast_food_per_week, sugary_drinks_per_week,
        commitment_to_change, importance, confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dataId, userId,
        dietData.vegetables_per_day, dietData.fruit_per_day, dietData.red_meat_per_week,
        dietData.fish_per_week, dietData.butter_per_week, dietData.beans_per_week,
        dietData.whole_grains_per_day, dietData.sweets_per_week, dietData.fast_food_per_week,
        dietData.sugary_drinks_per_week, commitBool, importanceVal, confidenceVal,
      ]
    );

    const scoreResult = getDietScore(dietData);
    // Write daily score to daily_scores table
    const scoreDate = new Date().toISOString().slice(0, 10);
    if (userId && scoreResult?.displayScore != null) {
      await db.execute(
        'INSERT INTO daily_scores (user_id, score_type, score_value, score_date) VALUES (?, ?, ?, ?)',
        [userId, 'diet', scoreResult.displayScore, scoreDate]
      );
    }
    return res.status(201).json({
      success: true,
      message: "Diet assessment saved successfully",
      score: scoreResult?.displayScore ?? null,
      mepaScore: scoreResult?.mepaScore ?? null,
    });
  } catch (error) {
    console.error("Error saving diet assessment:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

module.exports = { router };
