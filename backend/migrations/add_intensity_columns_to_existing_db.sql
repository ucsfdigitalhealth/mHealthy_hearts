-- Quick fix for existing mhearts databases that don't yet have the v1.3 columns.
-- Run this in phpMyAdmin against the mhearts database.
-- Safe to run — uses IF NOT EXISTS / MODIFY only where needed.

-- symptom_events: new columns added by v1.3
ALTER TABLE symptom_events
  ADD COLUMN IF NOT EXISTS intensity_score         TINYINT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS weight_change_direction ENUM('gained','lost','not_sure') NULL,
  ADD COLUMN IF NOT EXISTS weight_change_lbs       DECIMAL(5,1) NULL;

-- ema_enrollments: make symptom_event_id nullable, add new columns
ALTER TABLE ema_enrollments
  MODIFY COLUMN symptom_event_id INT NULL,
  MODIFY COLUMN frequency ENUM('once','ongoing','weekly') NOT NULL;

ALTER TABLE ema_enrollments
  ADD COLUMN IF NOT EXISTS instrument_response_id INT NULL AFTER symptom_event_id,
  ADD COLUMN IF NOT EXISTS notification_channel   ENUM('text','email') NULL AFTER frequency;

-- New table for weekly instrument responses
CREATE TABLE IF NOT EXISTS symptom_instrument_responses (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  patient_id       VARCHAR(36)  NOT NULL,
  symptom_key      VARCHAR(60)  NOT NULL,
  instrument_id    VARCHAR(60)  NOT NULL,
  raw_responses    JSON         NOT NULL,
  raw_score        INT          NOT NULL,
  t_score          DECIMAL(5,2) NULL,
  severity_label   ENUM('mild','moderate','severe') NULL,
  enrollment_id    INT          NULL,
  responded_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_instrument_responses_patient_symptom    (patient_id, symptom_key),
  INDEX idx_instrument_responses_patient_instrument (patient_id, instrument_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
