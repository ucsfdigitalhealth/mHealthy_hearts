-- Migration: Create health assessment tables for Blood Sugar, BMI, and Diet
-- Date: 2024
-- Run this SQL script in your MySQL database

-- Table: blood_sugar_assessments
CREATE TABLE IF NOT EXISTS blood_sugar_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  test_type VARCHAR(64) NOT NULL,
  value DECIMAL(10,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Table: bmi_assessments
CREATE TABLE IF NOT EXISTS bmi_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  bmi_value DECIMAL(5,2) NOT NULL,
  weight DECIMAL(6,2) NULL,
  height DECIMAL(5,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Table: diet_assessments
CREATE TABLE IF NOT EXISTS diet_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  vegetables_per_day DECIMAL(4,2) NULL,
  fruit_per_day DECIMAL(4,2) NULL,
  red_meat_per_week DECIMAL(4,2) NULL,
  fish_per_week DECIMAL(4,2) NULL,
  butter_per_week DECIMAL(4,2) NULL,
  beans_per_week DECIMAL(4,2) NULL,
  whole_grains_per_day DECIMAL(4,2) NULL,
  sweets_per_week DECIMAL(4,2) NULL,
  fast_food_per_week DECIMAL(4,2) NULL,
  sugary_drinks_per_week DECIMAL(4,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
