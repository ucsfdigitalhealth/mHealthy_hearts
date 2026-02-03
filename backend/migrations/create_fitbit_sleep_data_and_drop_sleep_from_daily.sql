-- Migration: Create fitbit_sleep_data table and remove sleep columns from fitbit_daily_data
-- Sleep is keyed by "bed date" (local timezone): the calendar date when the user went to bed.
-- Date: 2026

-- 1) Create fitbit_sleep_data (one row per user per bed-date)
CREATE TABLE IF NOT EXISTS fitbit_sleep_data (
  data_id CHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL COMMENT 'Bed date (local): calendar date when user went to bed',
  total_minutes_asleep INT NOT NULL DEFAULT 0,
  total_time_in_bed INT NOT NULL DEFAULT 0,
  sleep_efficiency DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_date (user_id, date),
  INDEX idx_user_id (user_id),
  INDEX idx_date (date)
);

-- 2) Remove sleep columns from fitbit_daily_data
ALTER TABLE fitbit_daily_data
  DROP COLUMN total_minutes_asleep,
  DROP COLUMN total_time_in_bed,
  DROP COLUMN sleep_efficiency;
