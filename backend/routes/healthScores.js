const express = require("express");
const router = express.Router();
const db = require("../db.js");
const { verifyToken } = require("../auth.js");

// Helper function to calculate blood sugar score
function calculateBloodSugarScore(value) {
  if (value < 100) return 100;
  if (value >= 100 && value <= 125) return 60;
  if (value >= 126 && value <= 154) return 40;
  if (value >= 155 && value <= 182) return 30;
  if (value >= 183 && value <= 212) return 20;
  if (value >= 213 && value <= 240) return 10;
  return 0; // >= 241
}

// Helper function to calculate BMI score
function calculateBMIScore(bmi) {
  if (bmi < 25) return 100;
  if (bmi >= 25.0 && bmi <= 29.9) return 70;
  if (bmi >= 30.0 && bmi <= 34.9) return 30;
  if (bmi >= 35.0 && bmi <= 39.9) return 15;
  return 0; // >= 40.0
}

// Helper function to calculate diet score based on MEPA criteria
function calculateDietScore(dietData) {
  if (!dietData) return null;

  let mepaScore = 0; // Total score 0-10

  // Vegetables: ≥2 servings per day
  if (dietData.vegetables_per_day >= 2) mepaScore += 1;

  // Fruit: ≥1 serving per day
  if (dietData.fruit_per_day >= 1) mepaScore += 1;

  // Red meat / processed meat: ≤3 servings per week
  if (dietData.red_meat_per_week !== null && dietData.red_meat_per_week <= 3) mepaScore += 1;

  // Fish / seafood: ≥1 serving per week
  if (dietData.fish_per_week >= 1) mepaScore += 1;

  // Butter / cream: ≤5 servings per week
  if (dietData.butter_per_week !== null && dietData.butter_per_week <= 5) mepaScore += 1;

  // Beans / legumes: ≥3 servings per week
  if (dietData.beans_per_week >= 3) mepaScore += 1;

  // Whole grains: ≥3 servings per day
  if (dietData.whole_grains_per_day >= 3) mepaScore += 1;

  // Sweets / pastries: ≤4 servings per week
  if (dietData.sweets_per_week !== null && dietData.sweets_per_week <= 4) mepaScore += 1;

  // Fast food: ≤1 meal per week
  if (dietData.fast_food_per_week !== null && dietData.fast_food_per_week <= 1) mepaScore += 1;

  // Sugar-sweetened beverages: ≥7 servings per week (NOTE: This seems unusual, but implementing as specified)
  // If the value is null, we can't determine if criteria is met, so don't add point
  if (dietData.sugary_drinks_per_week !== null && dietData.sugary_drinks_per_week >= 7) mepaScore += 1;

  // Convert MEPA score (0-10) to display score
  // User specified: 100 | 15-16, 80 | 12-14, 50 | 8-11, 25 | 4-7, 0 | 0-3
  // But MEPA score range is 0-10, so adjusting to: 100 | 8-10, 80 | 6-7, 50 | 4-5, 25 | 2-3, 0 | 0-1
  // If user wants different ranges, they can be adjusted here
  let displayScore;
  if (mepaScore >= 8) {
    displayScore = 100; // Top tier: 8-10 (adjusted from 15-16)
  } else if (mepaScore >= 6) {
    displayScore = 80; // Second tier: 6-7 (adjusted from 12-14)
  } else if (mepaScore >= 4) {
    displayScore = 50; // Third tier: 4-5 (adjusted from 8-11)
  } else if (mepaScore >= 2) {
    displayScore = 25; // Fourth tier: 2-3 (adjusted from 4-7)
  } else {
    displayScore = 0; // Bottom tier: 0-1 (adjusted from 0-3)
  }

  return { mepaScore, displayScore };
}

// GET /api/health-scores
// Gets all health scores (blood lipids, blood sugar, BMI, diet) for the authenticated user
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get latest blood lipid value
    const [bloodLipidRows] = await db.execute(
      "SELECT value FROM blood_lipids_assessments WHERE user_id = ? AND value IS NOT NULL ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    let bloodLipidScore = null;
    let bloodLipidValue = null;
    if (bloodLipidRows && bloodLipidRows.length > 0 && bloodLipidRows[0].value !== null) {
      bloodLipidValue = Number(bloodLipidRows[0].value);
      // Calculate blood lipid score
      if (bloodLipidValue < 130) {
        bloodLipidScore = 100;
      } else if (bloodLipidValue >= 130 && bloodLipidValue <= 159) {
        bloodLipidScore = 60;
      } else if (bloodLipidValue >= 160 && bloodLipidValue <= 189) {
        bloodLipidScore = 40;
      } else if (bloodLipidValue >= 190 && bloodLipidValue <= 219) {
        bloodLipidScore = 20;
      } else {
        bloodLipidScore = 0;
      }
    }

    // Get latest blood sugar value
    const [bloodSugarRows] = await db.execute(
      "SELECT value, test_type FROM blood_sugar_assessments WHERE user_id = ? AND value IS NOT NULL ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    let bloodSugarScore = null;
    let bloodSugarValue = null;
    let bloodSugarTestType = null;
    if (bloodSugarRows && bloodSugarRows.length > 0 && bloodSugarRows[0].value !== null) {
      bloodSugarValue = Number(bloodSugarRows[0].value);
      bloodSugarTestType = bloodSugarRows[0].test_type;
      // For HbA1c, we might need different ranges, but for now using Fasting Glucose ranges
      // If test_type is HbA1c, we should convert or use different ranges
      bloodSugarScore = calculateBloodSugarScore(bloodSugarValue);
    }

    // Get latest BMI value
    const [bmiRows] = await db.execute(
      "SELECT bmi_value FROM bmi_assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    let bmiScore = null;
    let bmiValue = null;
    if (bmiRows && bmiRows.length > 0) {
      bmiValue = Number(bmiRows[0].bmi_value);
      bmiScore = calculateBMIScore(bmiValue);
    }

    // Get latest diet assessment
    const [dietRows] = await db.execute(
      "SELECT * FROM diet_assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    let dietScore = null;
    let dietMepaScore = null;
    if (dietRows && dietRows.length > 0) {
      const dietResult = calculateDietScore(dietRows[0]);
      if (dietResult) {
        dietMepaScore = dietResult.mepaScore;
        dietScore = dietResult.displayScore;
      }
    }

    return res.status(200).json({
      bloodLipids: {
        score: bloodLipidScore,
        value: bloodLipidValue,
      },
      bloodSugar: {
        score: bloodSugarScore,
        value: bloodSugarValue,
        testType: bloodSugarTestType,
      },
      bmi: {
        score: bmiScore,
        value: bmiValue,
      },
      diet: {
        score: dietScore,
        mepaScore: dietMepaScore, // Raw MEPA score (0-10)
      },
    });
  } catch (error) {
    console.error("[GET /api/health-scores] Error:", error);
    console.error("[GET /api/health-scores] Error stack:", error.stack);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

module.exports = { router };
