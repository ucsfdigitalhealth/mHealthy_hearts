-- =============================================================================
-- v1.4 Changed Tables — Reference Only
-- Shows the tables that were added or modified by the symptom flow v1.4
-- restructure (single disclaimer gate, two entry points, combined weekly plan).
-- NOT a runnable migration — use full_migrate.sql or symptom_flow_v1_4_20260614.sql.
-- =============================================================================


-- ── NEW: weekly_symptom_plans ───────────────────────────────────────────────
-- One combined weekly symptom-tracking plan per user: up to 6 selected weekly
-- instrument symptoms + a single shared reminder slot (day/time/channel).

CREATE TABLE weekly_symptom_plans (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  user_id               VARCHAR(36) NOT NULL,
  symptom_keys          JSON NOT NULL,              -- e.g. ["fatigue","anxiety","hot_flashes"], max 6 enforced server-side
  day_of_week           TINYINT UNSIGNED NOT NULL,  -- 0=Sunday … 6=Saturday
  time                  VARCHAR(5) NOT NULL,        -- "HH:MM"
  notification_channel  ENUM('text','email') NOT NULL,
  is_active             TINYINT(1) NOT NULL DEFAULT 1,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_weekly_plan_user (user_id),
  INDEX idx_weekly_plan_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ── MODIFIED: ema_enrollments ────────────────────────────────────────────────
-- Added: schedule_type, start_date, end_date
-- Repurposed for momentary "track this on a regular schedule?" recurring
-- reminders (schedule_type='daily_times', schedule={"times":[...]}, start_date
-- required, end_date optional). Existing weekly_day_time rows are unaffected
-- (schedule_type defaults to 'weekly_day_time').

CREATE TABLE ema_enrollments (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  user_id                VARCHAR(36)           NOT NULL,
  symptom_event_id       INT                   NULL,
  instrument_response_id INT                   NULL,
  symptom_key            VARCHAR(60)           NOT NULL,
  instrument_key         VARCHAR(60)           NOT NULL,
  schedule               JSON                  NULL,
  frequency              ENUM('once','ongoing','weekly') NOT NULL,
  schedule_type          ENUM('weekly_day_time','daily_times') NOT NULL DEFAULT 'weekly_day_time',  -- NEW
  start_date             DATE                  NULL,  -- NEW
  end_date               DATE                  NULL,  -- NEW
  notification_channel   ENUM('text','email')  NULL,
  is_active              TINYINT(1)            NOT NULL DEFAULT 1,
  enrolled_at            TIMESTAMP             DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ema_enrollments_user_active (user_id, is_active),
  INDEX idx_ema_enrollments_symptom_key (user_id, symptom_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ── MODIFIED: symptom_instrument_responses ──────────────────────────────────
-- Added: weekly_plan_id
-- Links each response to the combined weekly check-in session it was
-- submitted as part of (null for standalone/legacy responses).

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
  weekly_plan_id   INT          NULL,  -- NEW
  responded_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_instrument_responses_patient_symptom    (patient_id, symptom_key),
  INDEX idx_instrument_responses_patient_instrument (patient_id, instrument_id),
  INDEX idx_instrument_responses_weekly_plan        (weekly_plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
