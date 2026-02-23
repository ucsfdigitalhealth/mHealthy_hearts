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

module.exports = { getBloodGlucoseScore };
