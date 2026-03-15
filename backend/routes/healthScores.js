const express = require("express");
const router = express.Router();
const db = require("../db.js");
const { verifyToken } = require("../auth.js");
const { getBloodGlucoseScore, getBMIScore, getDietScore, getNicotineScore, getPhysicalActivityScore, getSleepScore } = require("../metricCalc.js");

// GET /api/health-scores
// Gets all health scores (blood lipids, blood sugar, BMI, diet, smoking) for the authenticated user
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
      bloodSugarScore = getBloodGlucoseScore({ testType: bloodSugarTestType, value: bloodSugarValue });
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
      bmiScore = getBMIScore(bmiValue);
    }

    // Get latest diet assessment
    const [dietRows] = await db.execute(
      "SELECT * FROM diet_assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    let dietScore = null;
    let dietMepaScore = null;
    if (dietRows && dietRows.length > 0) {
      const dietResult = getDietScore(dietRows[0]);
      if (dietResult) {
        dietMepaScore = dietResult.mepaScore;
        dietScore = dietResult.displayScore;
      }
    }

    // Get latest smoking assessment
    const [smokingRows] = await db.execute(
      "SELECT * FROM smoking_assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    let smokingScore = null;
    let smokingCategory = null;
    if (smokingRows && smokingRows.length > 0) {
      smokingCategory = smokingRows[0].category;
      smokingScore = getNicotineScore({
        category: smokingRows[0].category,
        frequency: smokingRows[0].frequency,
        timeQuit: smokingRows[0].time_quit,
        secondHandExposure: smokingRows[0].second_hand_exposure,
      });
    }

    // Physical Activity — today's steps from fitbit_daily_data
    const today = new Date().toISOString().slice(0, 10);
    const [activityRows] = await db.execute(
      "SELECT steps FROM fitbit_daily_data WHERE user_id = ? AND date = ? ORDER BY updated_at DESC LIMIT 1",
      [userId, today]
    );
    const [goalRows] = await db.execute(
      "SELECT step_target FROM daily_goals WHERE user_id = ? AND goal_date = ?",
      [userId, today]
    );
    let physicalActivityScore = null;
    let physicalActivitySteps = null;
    if (activityRows && activityRows.length > 0 && activityRows[0].steps != null) {
      physicalActivitySteps = Number(activityRows[0].steps);
      const goalSteps = goalRows && goalRows.length > 0 ? Number(goalRows[0].step_target) : 10000;
      physicalActivityScore = getPhysicalActivityScore(physicalActivitySteps, goalSteps);
    }

    // Sleep — yesterday's sleep from fitbit_sleep_data
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const [sleepDbRows] = await db.execute(
      "SELECT total_minutes_asleep FROM fitbit_sleep_data WHERE user_id = ? AND date = ? ORDER BY updated_at DESC LIMIT 1",
      [userId, yesterday]
    );
    let sleepScore = null;
    let sleepHours = null;
    if (sleepDbRows && sleepDbRows.length > 0 && sleepDbRows[0].total_minutes_asleep != null) {
      sleepHours = Number(sleepDbRows[0].total_minutes_asleep) / 60;
      sleepScore = getSleepScore(sleepHours);
    }

    // Calculate composite score (average of available scores)
    const scoreValues = [
      bloodLipidScore,
      bloodSugarScore,
      bmiScore,
      dietScore,
      smokingScore,
      physicalActivityScore,
      sleepScore
    ].filter(v => typeof v === 'number' && !isNaN(v));
    let compositeScore = null;
    if (scoreValues.length > 0) {
      compositeScore = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
      // Write composite score to composite_scores table
      const scoreDate = new Date().toISOString().slice(0, 10);
      await db.execute(
        'INSERT INTO composite_scores (user_id, composite_score, score_date) VALUES (?, ?, ?)',
        [userId, compositeScore, scoreDate]
      );
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
      smoking: {
        score: smokingScore,
        category: smokingCategory,
      },
      physicalActivity: {
        score: physicalActivityScore,
        steps: physicalActivitySteps,
      },
      sleep: {
        score: sleepScore,
        hours: sleepHours,
      },
      compositeScore,
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
