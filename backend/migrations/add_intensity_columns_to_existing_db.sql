-- Drops and recreates the three tables changed by symptom flow v1.3.
-- WARNING: Existing data in these tables will be lost.
-- Run in phpMyAdmin against the mhearts database.

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS ema_enrollments;
DROP TABLE IF EXISTS symptom_instrument_responses;
DROP TABLE IF EXISTS symptom_events;

SET FOREIGN_KEY_CHECKS = 1;


CREATE TABLE symptom_events (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  user_id                  VARCHAR(36)  NOT NULL,
  symptom_key              VARCHAR(60)  NOT NULL,
  symptom_label            VARCHAR(120) NOT NULL,
  tracking_type            ENUM('event_log_only', 'event_log_ema') NOT NULL,
  occurred_at              DATETIME     NOT NULL,
  duration_bucket          ENUM('1_min_or_less', '10_min_or_less', '1_hour_or_less', 'more_than_1_hour') NOT NULL,
  activities               JSON         NOT NULL,
  safety_modal_shown       TINYINT(1)   NOT NULL DEFAULT 0,
  intensity_score          TINYINT UNSIGNED NULL,
  weight_change_direction  ENUM('gained','lost','not_sure') NULL,
  weight_change_lbs        DECIMAL(5,1) NULL,
  created_at               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_symptom_events_user_symptom  (user_id, symptom_key),
  INDEX idx_symptom_events_user_occurred (user_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE ema_enrollments (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  user_id                VARCHAR(36)           NOT NULL,
  symptom_event_id       INT                   NULL,
  instrument_response_id INT                   NULL,
  symptom_key            VARCHAR(60)           NOT NULL,
  instrument_key         VARCHAR(60)           NOT NULL,
  schedule               JSON                  NULL,
  frequency              ENUM('once','ongoing','weekly') NOT NULL,
  notification_channel   ENUM('text','email')  NULL,
  is_active              TINYINT(1)            NOT NULL DEFAULT 1,
  enrolled_at            TIMESTAMP             DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ema_enrollments_user_active (user_id, is_active),
  INDEX idx_ema_enrollments_symptom_key (user_id, symptom_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE symptom_instrument_responses (
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
