-- Symptom Flow v1.3 Migration — 2026-05-28
-- Run manually against the mhearts database in MAMP.
-- Adds: intensity fields on symptom_events, instrument_responses table,
--       hot_flashes to disclaimer log, weekly frequency + notification_channel
--       on ema_enrollments, nullable symptom_event_id for weekly path.

-- 1. Extend symptom_events with intensity / weight-change columns
ALTER TABLE symptom_events
  ADD COLUMN IF NOT EXISTS intensity_score          TINYINT UNSIGNED NULL        COMMENT '0–10 severity scale',
  ADD COLUMN IF NOT EXISTS weight_change_direction  ENUM('gained','lost','not_sure') NULL,
  ADD COLUMN IF NOT EXISTS weight_change_lbs        DECIMAL(5,1) NULL;

-- 2. symptom_disclaimer_log — add hot_flashes context value if not already present
-- (ENUM modification is safe; adds value without changing existing data)
ALTER TABLE symptom_disclaimer_log
  MODIFY COLUMN context ENUM('login','section_entry','acute_symptom_modal') NOT NULL;

-- 3. Extend ema_enrollments
--    a. Make symptom_event_id nullable (weekly path has no event)
ALTER TABLE ema_enrollments
  MODIFY COLUMN symptom_event_id INT NULL;

--    b. Add weekly to frequency ENUM and notification_channel
ALTER TABLE ema_enrollments
  MODIFY COLUMN frequency ENUM('once','ongoing','weekly') NOT NULL;

ALTER TABLE ema_enrollments
  ADD COLUMN IF NOT EXISTS instrument_response_id INT NULL AFTER symptom_event_id,
  ADD COLUMN IF NOT EXISTS notification_channel   ENUM('text','email') NULL AFTER frequency;

-- 4. Instrument responses table
CREATE TABLE IF NOT EXISTS symptom_instrument_responses (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  patient_id       VARCHAR(36) NOT NULL,
  symptom_key      VARCHAR(60) NOT NULL,
  instrument_id    VARCHAR(60) NOT NULL,
  raw_responses    JSON NOT NULL,
  raw_score        INT NOT NULL,
  t_score          DECIMAL(5,2) NULL,
  severity_label   ENUM('mild','moderate','severe') NULL,
  enrollment_id    INT NULL,
  responded_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_patient_symptom    (patient_id, symptom_key),
  INDEX idx_patient_instrument (patient_id, instrument_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
