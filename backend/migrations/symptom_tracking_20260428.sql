-- Symptom Tracking Feature — Migration
-- Run this file manually against the mhearts database in MAMP.
-- Safe to re-run (IF NOT EXISTS on all tables).

CREATE TABLE IF NOT EXISTS symptom_events (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          VARCHAR(36) NOT NULL,
  symptom_key      VARCHAR(60) NOT NULL,
  symptom_label    VARCHAR(120) NOT NULL,
  tracking_type    ENUM('event_log_only', 'event_log_ema') NOT NULL,
  occurred_at      DATETIME NOT NULL,
  duration_bucket  ENUM('1_min_or_less', '10_min_or_less', '1_hour_or_less', 'more_than_1_hour') NOT NULL,
  activities       JSON NOT NULL,
  safety_modal_shown TINYINT(1) NOT NULL DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_symptom  (user_id, symptom_key),
  INDEX idx_user_occurred (user_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS symptom_disclaimer_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  context    ENUM('login', 'section_entry', 'acute_symptom_modal') NOT NULL,
  shown_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_context (user_id, context)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
