-- Migration: Create daily_goals and activity_streaks for Activity / Goal flow
-- Run this in your MySQL database

-- Table: daily_goals
-- One row per user per calendar day (goal_date in client timezone)
CREATE TABLE IF NOT EXISTS daily_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  goal_date DATE NOT NULL,
  step_target INT NOT NULL,
  symptom_rating INT NULL,
  completed_yesterday TINYINT(1) NULL,
  goal_met TINYINT(1) NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_goal_date (user_id, goal_date),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, goal_date)
);

-- Table: activity_streaks
-- One row per user; current_streak and longest_streak
CREATE TABLE IF NOT EXISTS activity_streaks (
  user_id VARCHAR(36) NOT NULL PRIMARY KEY,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_goal_met_date DATE NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE
);
