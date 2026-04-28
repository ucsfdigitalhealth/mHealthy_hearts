-- EMA Enrollment Table — Migration
-- Drops and recreates the table. Safe to re-run.
-- day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday

DROP TABLE IF EXISTS ema_enrollments;

CREATE TABLE ema_enrollments (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          VARCHAR(36) NOT NULL,
  symptom_event_id INT NOT NULL,
  symptom_key      VARCHAR(60) NOT NULL,
  instrument_key   VARCHAR(60) NOT NULL,
  schedule         JSON NULL,
  frequency        ENUM('once', 'ongoing') NOT NULL,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  enrolled_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_active  (user_id, is_active),
  INDEX idx_symptom_key  (user_id, symptom_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
