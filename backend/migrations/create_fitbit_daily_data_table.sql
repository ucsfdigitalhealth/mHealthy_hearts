-- Migration: Create fitbit_daily_data table for daily activity and sleep metrics
-- Date: 2026

-- Table: fitbit_daily_data
-- MySQL has no native UUID type; UUIDs are stored as CHAR(36).
CREATE TABLE IF NOT EXISTS fitbit_daily_data (
  data_id CHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  steps INT NOT NULL DEFAULT 0,
  minutes_lightly_active INT NOT NULL DEFAULT 0,
  minutes_fairly_active INT NOT NULL DEFAULT 0,
  minutes_very_active INT NOT NULL DEFAULT 0,
  total_minutes_asleep INT NOT NULL DEFAULT 0,
  total_time_in_bed INT NOT NULL DEFAULT 0,
  sleep_efficiency DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_date (date),
  INDEX idx_user_date (user_id, date)
);
