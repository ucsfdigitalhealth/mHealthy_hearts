-- Migration: create_user_goals_table.sql
CREATE TABLE IF NOT EXISTS user_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  step_goal INT,
  sleep_goal INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);