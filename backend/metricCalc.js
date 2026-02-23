/**
 * Calculate a blood glucose score (0–100) based on LE8 scoring criteria.
 *
 * @param {Object} params
 * @param {string} params.testType - 'Fasting Blood Glucose' or 'HbA1c'
 * @param {number|null} params.value - numeric test result
 * @returns {number|null} score 0–100, or null if no value
 */
function getBloodGlucoseScore({ testType, value }) {
  if (value === null || value === undefined) return null;

  const v = Number(value);
  if (isNaN(v)) return null;

  if (testType === 'HbA1c') {
    if (v < 5.7) return 100;
    if (v <= 6.4) return 60;
    if (v <= 6.9) return 40;
    if (v <= 7.9) return 25;
    if (v <= 8.9) return 20;
    if (v <= 9.9) return 10;
    return 0;
  }

  // Fasting Blood Glucose (mg/dL)
  if (v < 100) return 100;
  if (v <= 125) return 60;
  if (v <= 154) return 40;
  if (v <= 182) return 30;
  if (v <= 212) return 20;
  if (v <= 240) return 10;
  return 0;
}

/**
 * Calculate a BMI score (0–100) based on LE8 scoring criteria.
 *
 * @param {number|null} bmiValue - BMI value
 * @returns {number|null} score 0–100, or null if no value
 */
function getBMIScore(bmiValue) {
  if (bmiValue === null || bmiValue === undefined) return null;
  const v = Number(bmiValue);
  if (isNaN(v)) return null;
  if (v < 25) return 100;
  if (v <= 29.9) return 70;
  if (v <= 34.9) return 30;
  if (v <= 39.9) return 15;
  return 0; // >= 40
}

/**
 * Calculate a diet score (0–100) based on MEPA criteria.
 * Accepts an object with snake_case keys matching the diet_assessments table.
 *
 * @param {Object} d - diet data row
 * @returns {{ mepaScore: number, displayScore: number } | null}
 */
function getDietScore(d) {
  if (!d) return null;

  let mepaScore = 0;

  // Vegetables: ≥2 servings/day
  if (d.vegetables_per_day != null && d.vegetables_per_day >= 2) mepaScore += 1;
  // Fruit: ≥1 serving/day
  if (d.fruit_per_day != null && d.fruit_per_day >= 1) mepaScore += 1;
  // Red/processed meat: ≤3 servings/week
  if (d.red_meat_per_week != null && d.red_meat_per_week <= 3) mepaScore += 1;
  // Fish: ≥1 serving/week
  if (d.fish_per_week != null && d.fish_per_week >= 1) mepaScore += 1;
  // Butter/cream: ≤5 servings/week
  if (d.butter_per_week != null && d.butter_per_week <= 5) mepaScore += 1;
  // Beans/legumes: ≥3 servings/week
  if (d.beans_per_week != null && d.beans_per_week >= 3) mepaScore += 1;
  // Whole grains: ≥3 servings/day
  if (d.whole_grains_per_day != null && d.whole_grains_per_day >= 3) mepaScore += 1;
  // Sweets/pastries: ≤4 servings/week
  if (d.sweets_per_week != null && d.sweets_per_week <= 4) mepaScore += 1;
  // Fast food: ≤1 meal/week
  if (d.fast_food_per_week != null && d.fast_food_per_week <= 1) mepaScore += 1;
  // Sugary drinks: ≥7 servings/week
  if (d.sugary_drinks_per_week != null && d.sugary_drinks_per_week >= 7) mepaScore += 1;

  let displayScore;
  if (mepaScore >= 8)      displayScore = 100;
  else if (mepaScore >= 6) displayScore = 80;
  else if (mepaScore >= 4) displayScore = 50;
  else if (mepaScore >= 2) displayScore = 25;
  else                     displayScore = 0;

  return { mepaScore, displayScore };
}

/**
 * Calculate a non-HDL cholesterol score (0–100) based on LE8 scoring criteria.
 *
 * @param {number|null} value - non-HDL cholesterol in mg/dL
 * @returns {number|null} score 0–100, or null if no value
 */
function getNonHDLScore(value) {
  if (value === null || value === undefined) return null;
  const v = Number(value);
  if (isNaN(v)) return null;
  if (v < 130) return 100;
  if (v <= 159) return 60;
  if (v <= 189) return 40;
  if (v <= 219) return 20;
  return 0; // >= 220
}

module.exports = { getBloodGlucoseScore, getBMIScore, getDietScore, getNonHDLScore };
