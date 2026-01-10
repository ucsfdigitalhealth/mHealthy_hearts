const express = require("express");
const router = express.Router();
const db = require("../db.js");
const { verifyToken } = require("../auth.js");

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
    } = req.body || {};

    // Convert all values to numbers (null if not provided)
    const numericValue = (val) => {
      if (val === undefined || val === null || val === "") return null;
      const num = Number(val);
      return Number.isNaN(num) ? null : num;
    };

    await db.execute(
      `INSERT INTO diet_assessments (
        user_id, 
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        numericValue(vegetablesPerDay),
        numericValue(fruitPerDay),
        numericValue(redMeatPerWeek),
        numericValue(fishPerWeek),
        numericValue(butterPerWeek),
        numericValue(beansPerWeek),
        numericValue(wholeGrainsPerDay),
        numericValue(sweetsPerWeek),
        numericValue(fastFoodPerWeek),
        numericValue(sugaryDrinksPerWeek),
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Diet assessment saved successfully",
    });
  } catch (error) {
    console.error("Error saving diet assessment:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

module.exports = { router };
