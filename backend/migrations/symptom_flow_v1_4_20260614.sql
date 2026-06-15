-- Symptom Flow v1.4 Migration — 2026-06-14
-- Run manually against the mhearts database in MAMP.
-- Adds: weekly_symptom_plans table (single combined weekly check-in plan per user),
--       schedule_type/start_date/end_date on ema_enrollments (momentary recurring
--       reminders using a daily-times + date-range shape, separate from the
--       existing weekly_day_time shape),
--       weekly_plan_id on symptom_instrument_responses (links a response to the
--       weekly session/plan it was submitted as part of).

-- 1. New table: one combined weekly symptom-tracking plan per user.
--    symptom_keys: JSON array of up to 6 keys, all in WEEKLY_INSTRUMENT_KEYS
--      (backend/config/instruments.js), e.g. ["fatigue","anxiety","hot_flashes"].
--    day_of_week/time/notification_channel: the single shared weekly reminder slot.
CREATE TABLE IF NOT EXISTS weekly_symptom_plans (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  user_id               VARCHAR(36) NOT NULL,
  symptom_keys          JSON NOT NULL,
  day_of_week           TINYINT UNSIGNED NOT NULL,
  time                  VARCHAR(5) NOT NULL,
  notification_channel  ENUM('text','email') NOT NULL,
  is_active             TINYINT(1) NOT NULL DEFAULT 1,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_weekly_plan_user (user_id),
  INDEX idx_weekly_plan_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Extend ema_enrollments for momentary recurring reminders.
--    schedule_type: 'weekly_day_time' (existing shape: array of {day_of_week,time})
--                    vs 'daily_times' (new shape: {"times": ["08:00","20:00"]}).
--    Existing rows default to 'weekly_day_time' — no backfill needed.
--    start_date/end_date: only used for schedule_type='daily_times'.
ALTER TABLE ema_enrollments
  ADD COLUMN schedule_type ENUM('weekly_day_time','daily_times') NOT NULL DEFAULT 'weekly_day_time' AFTER frequency,
  ADD COLUMN start_date DATE NULL AFTER schedule_type,
  ADD COLUMN end_date   DATE NULL AFTER start_date;

-- 3. Link instrument responses to the weekly plan/session they belong to.
ALTER TABLE symptom_instrument_responses
  ADD COLUMN weekly_plan_id INT NULL AFTER enrollment_id,
  ADD INDEX idx_instrument_responses_weekly_plan (weekly_plan_id);
