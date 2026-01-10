-- Migration: Create health assessment tables for Blood Sugar, BMI, and Diet
-- Date: 2024

-- Table: blood_sugar_assessments
CREATE TABLE IF NOT EXISTS blood_sugar_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  test_type VARCHAR(64) NOT NULL, -- 'Fasting Blood Glucose' or 'HbA1c'
  value DECIMAL(10,2) NULL, -- Blood sugar value in mg/dL (for Fasting) or % (for HbA1c)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Table: bmi_assessments
CREATE TABLE IF NOT EXISTS bmi_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  bmi_value DECIMAL(5,2) NOT NULL, -- BMI value (e.g., 25.5)
  weight DECIMAL(6,2) NULL, -- Optional: weight in lbs
  height DECIMAL(5,2) NULL, -- Optional: height in inches
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Table: diet_assessments
CREATE TABLE IF NOT EXISTS diet_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  -- Food category servings (per day or per week as specified)
  vegetables_per_day DECIMAL(4,2) NULL, -- servings per day
  fruit_per_day DECIMAL(4,2) NULL, -- servings per day
  red_meat_per_week DECIMAL(4,2) NULL, -- servings per week
  fish_per_week DECIMAL(4,2) NULL, -- servings per week
  butter_per_week DECIMAL(4,2) NULL, -- servings per week
  beans_per_week DECIMAL(4,2) NULL, -- servings per week
  whole_grains_per_day DECIMAL(4,2) NULL, -- servings per day
  sweets_per_week DECIMAL(4,2) NULL, -- servings per week
  fast_food_per_week DECIMAL(4,2) NULL, -- meals per week
  sugary_drinks_per_week DECIMAL(4,2) NULL, -- servings per week
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
