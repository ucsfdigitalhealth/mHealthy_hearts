-- =============================================================================
-- full_migrate.sql — mHealthy Hearts
--
-- Single file to create every table in the application from scratch.
-- Safe to re-run: drops all tables first, then recreates them in order.
--
-- WARNING: All existing data will be lost. Back up first.
-- Run in MAMP phpMyAdmin: paste into the SQL tab on the mhearts database.
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS user_goals;
DROP TABLE IF EXISTS ema_enrollments;
DROP TABLE IF EXISTS symptom_instrument_responses;
DROP TABLE IF EXISTS symptom_disclaimer_log;
DROP TABLE IF EXISTS symptom_events;
DROP TABLE IF EXISTS activity_streaks;
DROP TABLE IF EXISTS daily_goals;
DROP TABLE IF EXISTS composite_scores;
DROP TABLE IF EXISTS daily_scores;
DROP TABLE IF EXISTS le8_composite_scores;
DROP TABLE IF EXISTS diet_assessments;
DROP TABLE IF EXISTS blood_lipids_assessments;
DROP TABLE IF EXISTS bmi_assessments;
DROP TABLE IF EXISTS blood_sugar_assessments;
DROP TABLE IF EXISTS smoking_assessments;
DROP TABLE IF EXISTS fitbit_sleep_data;
DROP TABLE IF EXISTS fitbit_daily_data;
DROP TABLE IF EXISTS user_auth_testing;

SET FOREIGN_KEY_CHECKS = 1;


-- =============================================================================
-- 1. USER AUTH
-- Must be created first — all other tables with user FKs reference this one.
-- =============================================================================

CREATE TABLE user_auth_testing (
  id                   VARCHAR(36)  PRIMARY KEY DEFAULT (uuid()),
  username             VARCHAR(255) NOT NULL,
  email                VARCHAR(255) UNIQUE NOT NULL,
  password             VARCHAR(255) NOT NULL,
  created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  refresh_token        VARCHAR(255),
  refresh_token_expires DATETIME,
  fitbit_access_token  TEXT,
  fitbit_refresh_token TEXT,
  fitbit_token_expires TIMESTAMP,
  fitbit_pkce_verifier VARCHAR(512),
  fitbit_oauth_state   VARCHAR(128),
  omron_access_token   TEXT,
  omron_refresh_token  TEXT,
  omron_token_expires  TIMESTAMP,
  omron_pkce_verifier  VARCHAR(512),
  omron_oauth_state    VARCHAR(128)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =============================================================================
-- 2. FITBIT DEVICE DATA
-- =============================================================================

-- Activity data cached from Fitbit API. One row per user per calendar day.
-- physical_activity_score: LE8 component score 0–100 derived from step count.
CREATE TABLE fitbit_daily_data (
  data_id                 CHAR(36)     NOT NULL,
  user_id                 VARCHAR(36)  NOT NULL,
  date                    DATE         NOT NULL,
  steps                   INT          NOT NULL DEFAULT 0,
  minutes_lightly_active  INT          NOT NULL DEFAULT 0,
  minutes_fairly_active   INT          NOT NULL DEFAULT 0,
  minutes_very_active     INT          NOT NULL DEFAULT 0,
  physical_activity_score DECIMAL(5,2) NULL,
  updated_at              DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  UNIQUE KEY uk_fitbit_daily_user_date (user_id, date),
  INDEX idx_fitbit_daily_user_id (user_id),
  INDEX idx_fitbit_daily_date    (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Sleep data cached from Fitbit API. Keyed by bed date (local timezone).
-- sleep_score: LE8 component score 0–100 derived from total_minutes_asleep.
CREATE TABLE fitbit_sleep_data (
  data_id              CHAR(36)     NOT NULL,
  user_id              VARCHAR(36)  NOT NULL,
  date                 DATE         NOT NULL COMMENT 'Bed date (local): calendar date when user went to bed',
  total_minutes_asleep INT          NOT NULL DEFAULT 0,
  total_time_in_bed    INT          NOT NULL DEFAULT 0,
  sleep_efficiency     DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  sleep_score          DECIMAL(5,2) NULL,
  updated_at           DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  UNIQUE KEY uk_fitbit_sleep_user_date (user_id, date),
  INDEX idx_fitbit_sleep_user_id (user_id),
  INDEX idx_fitbit_sleep_date    (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =============================================================================
-- 3. LE8 HEALTH ASSESSMENT TABLES
-- Each table stores one patient-submitted assessment.
-- score column: LE8 component score 0–100 calculated at insert time.
-- importance/confidence only stored when commitment_to_change = 1.
-- =============================================================================

CREATE TABLE smoking_assessments (
  data_id              CHAR(36)     NOT NULL,
  user_id              VARCHAR(36)  NULL,
  category             VARCHAR(20)  NULL,       -- 'current' | 'former' | 'never'
  frequency            VARCHAR(20)  NULL,       -- 'everyday' | 'somedays' | 'rarely'
  time_quit            VARCHAR(20)  NULL,       -- '<1' | '1+' | '5+'
  interest_in_quitting VARCHAR(20)  NULL,       -- '30days' | 'sometime' | 'no'
  type_smoker          VARCHAR(255) NULL,
  second_hand_exposure TINYINT(1)   NULL,
  commitment_to_change TINYINT(1)   NULL,
  importance           INT          NULL,
  confidence           INT          NULL,
  score                DECIMAL(5,2) NULL,
  created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_smoking_user_id    (user_id),
  INDEX idx_smoking_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE blood_sugar_assessments (
  data_id              CHAR(36)      NOT NULL,
  user_id              VARCHAR(36)   NULL,
  test_type            VARCHAR(64)   NULL,       -- 'fasting' | 'HbA1c'
  value                DECIMAL(10,2) NULL,
  has_diabetes         TINYINT(1)    NULL,
  commitment_to_change TINYINT(1)    NULL,
  importance           INT           NULL,
  confidence           INT           NULL,
  score                DECIMAL(5,2)  NULL,
  created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_blood_sugar_user_id    (user_id),
  INDEX idx_blood_sugar_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE bmi_assessments (
  data_id              CHAR(36)     NOT NULL,
  user_id              VARCHAR(36)  NULL,
  bmi_value            DECIMAL(5,2) NULL,
  weight               DECIMAL(7,2) NULL,       -- lbs
  height               DECIMAL(7,2) NULL,       -- inches
  previous_bmi         DECIMAL(5,2) NULL,
  commitment_to_change TINYINT(1)   NULL,
  importance           INT          NULL,
  confidence           INT          NULL,
  score                DECIMAL(5,2) NULL,
  created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_bmi_user_id    (user_id),
  INDEX idx_bmi_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE blood_lipids_assessments (
  data_id              CHAR(36)     NOT NULL,
  user_id              VARCHAR(36)  NULL,
  measure_type         VARCHAR(50)  NULL,       -- e.g. 'non-hdl'
  value                DECIMAL(8,2) NULL,       -- mg/dL
  medication           TINYINT(1)   NULL,       -- 1 = on cholesterol medication
  commitment_to_change TINYINT(1)   NULL,
  importance           INT          NULL,
  confidence           INT          NULL,
  score                DECIMAL(5,2) NULL,
  created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_blood_lipids_user_id    (user_id),
  INDEX idx_blood_lipids_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE diet_assessments (
  data_id                CHAR(36)     NOT NULL,
  user_id                VARCHAR(36)  NULL,
  vegetables_per_day     DECIMAL(5,2) NULL,
  fruit_per_day          DECIMAL(5,2) NULL,
  red_meat_per_week      DECIMAL(5,2) NULL,
  fish_per_week          DECIMAL(5,2) NULL,
  butter_per_week        DECIMAL(5,2) NULL,
  beans_per_week         DECIMAL(5,2) NULL,
  whole_grains_per_day   DECIMAL(5,2) NULL,
  sweets_per_week        DECIMAL(5,2) NULL,
  fast_food_per_week     DECIMAL(5,2) NULL,
  sugary_drinks_per_week DECIMAL(5,2) NULL,
  commitment_to_change   TINYINT(1)   NULL,
  importance             INT          NULL,
  confidence             INT          NULL,
  score                  DECIMAL(5,2) NULL,
  created_at             TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_diet_user_id    (user_id),
  INDEX idx_diet_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =============================================================================
-- 4. SCORING TABLES
-- =============================================================================

-- Per-user, per-day individual component scores (lightweight lookup table).
CREATE TABLE daily_scores (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL,
  score_type  VARCHAR(32)  NOT NULL,       -- e.g. 'blood_sugar', 'bmi', 'diet'
  score_value DECIMAL(6,2) NOT NULL,
  score_date  DATE         NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_daily_scores_user_id    (user_id),
  INDEX idx_daily_scores_score_date (score_date),
  INDEX idx_daily_scores_score_type (score_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Per-user, per-day overall composite score.
CREATE TABLE composite_scores (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         VARCHAR(36)  NOT NULL,
  composite_score DECIMAL(6,2) NOT NULL,
  score_date      DATE         NOT NULL,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_composite_scores_user_id    (user_id),
  INDEX idx_composite_scores_score_date (score_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Full LE8 composite snapshot: one row per user per day with all 8 component
-- scores and the aggregate. Replaces composite_scores for LE8-specific reporting.
CREATE TABLE le8_composite_scores (
  id                      CHAR(36)     NOT NULL,
  user_id                 VARCHAR(36)  NOT NULL,
  score_date              DATE         NOT NULL,
  diet_score              DECIMAL(5,2) NULL,
  physical_activity_score DECIMAL(5,2) NULL,
  nicotine_score          DECIMAL(5,2) NULL,
  sleep_score             DECIMAL(5,2) NULL,
  bmi_score               DECIMAL(5,2) NULL,
  blood_lipids_score      DECIMAL(5,2) NULL,
  blood_sugar_score       DECIMAL(5,2) NULL,
  blood_pressure_score    DECIMAL(5,2) NULL,      -- reserved; BP not yet implemented
  composite_score         DECIMAL(5,2) NULL,
  components_counted      TINYINT      NULL,
  created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_le8_user_score_date (user_id, score_date),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_le8_composite_user_id    (user_id),
  INDEX idx_le8_composite_score_date (score_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =============================================================================
-- 5. ACTIVITY GOALS & STREAKS
-- =============================================================================

-- One row per user per calendar day.
CREATE TABLE daily_goals (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  user_id             VARCHAR(36) NOT NULL,
  goal_date           DATE        NOT NULL,
  step_target         INT         NOT NULL,
  symptom_rating      INT         NULL,
  completed_yesterday TINYINT(1)  NULL,
  goal_met            TINYINT(1)  NULL DEFAULT NULL,
  created_at          TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_goal_date (user_id, goal_date),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_daily_goals_user_date (user_id, goal_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- One row per user; updated in place as streaks grow.
CREATE TABLE activity_streaks (
  user_id            VARCHAR(36) NOT NULL PRIMARY KEY,
  current_streak     INT         NOT NULL DEFAULT 0,
  longest_streak     INT         NOT NULL DEFAULT 0,
  last_goal_met_date DATE        NULL,
  updated_at         TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =============================================================================
-- 6. SYMPTOM TRACKING
-- =============================================================================

-- Core symptom event log. One row per logged symptom.
-- activities: JSON array of strings (e.g. ["sitting", "walking"]).
-- tracking_type: 'event_log_only' = acute cardiac symptoms (no EMA follow-up);
--                'event_log_ema'  = ongoing symptoms eligible for recurring check-ins.
-- intensity_score: 0–10 patient-reported severity (null for weight_change events).
-- weight_change_*: used instead of intensity_score for 'weight_change' symptom only.
CREATE TABLE symptom_events (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  user_id                  VARCHAR(36)  NOT NULL,
  symptom_key              VARCHAR(60)  NOT NULL,    -- machine key e.g. 'chest_pain', 'fatigue'
  symptom_label            VARCHAR(120) NOT NULL,    -- human label e.g. 'Chest pain'
  tracking_type            ENUM('event_log_only', 'event_log_ema') NOT NULL,
  occurred_at              DATETIME     NOT NULL,    -- patient-reported time
  duration_bucket          ENUM('1_min_or_less', '10_min_or_less', '1_hour_or_less', 'more_than_1_hour') NOT NULL,
  activities               JSON         NOT NULL,
  safety_modal_shown       TINYINT(1)   NOT NULL DEFAULT 0,
  intensity_score          TINYINT UNSIGNED NULL     COMMENT '0–10 severity; null for weight_change',
  weight_change_direction  ENUM('gained','lost','not_sure') NULL,
  weight_change_lbs        DECIMAL(5,1) NULL,
  created_at               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_symptom_events_user_symptom  (user_id, symptom_key),
  INDEX idx_symptom_events_user_occurred (user_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- IRB/audit log: records every time the safety disclaimer was displayed.
-- context: where it appeared ('login', 'section_entry', 'acute_symptom_modal').
CREATE TABLE symptom_disclaimer_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  context    ENUM('login', 'section_entry', 'acute_symptom_modal') NOT NULL,
  shown_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_disclaimer_log_user_context (user_id, context)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- EMA enrollment preferences. One row per enrollment.
-- schedule: JSON array of {day_of_week, time} pairs for ongoing/weekly check-ins.
--   day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday
--   time: "HH:MM" string
--   Example: [{"day_of_week": 1, "time": "09:00"}, {"day_of_week": 3, "time": "14:00"}]
-- schedule is NULL when frequency = 'once'.
-- symptom_event_id: references symptom_events.id — NULL for weekly instrument path.
-- instrument_response_id: references symptom_instrument_responses.id — NULL for momentary path.
-- notification_channel: how to deliver weekly reminders (weekly frequency only).
-- instrument_key resolved from backend/config/instruments.js at enrollment time.
CREATE TABLE ema_enrollments (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  user_id                VARCHAR(36)           NOT NULL,
  symptom_event_id       INT                   NULL,    -- momentary path; null for weekly
  instrument_response_id INT                   NULL,    -- weekly path; null for momentary
  symptom_key            VARCHAR(60)           NOT NULL,
  instrument_key         VARCHAR(60)           NOT NULL,
  schedule               JSON                  NULL,
  frequency              ENUM('once','ongoing','weekly') NOT NULL,
  notification_channel   ENUM('text','email')  NULL,
  is_active              TINYINT(1)            NOT NULL DEFAULT 1,
  enrolled_at            TIMESTAMP             DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ema_enrollments_user_active   (user_id, is_active),
  INDEX idx_ema_enrollments_symptom_key   (user_id, symptom_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Weekly validated instrument responses.
-- raw_responses: JSON array of integer values (one per question, in order).
-- t_score: null for mMRC and HFRDIS (non-PROMIS instruments).
-- severity_label: populated for HFRDIS only ('mild'/'moderate'/'severe').
-- enrollment_id: FK to ema_enrollments; null if patient has not enrolled in recurring reminders.
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


-- =============================================================================
-- 7. LEGACY (not currently used in the app)
-- =============================================================================

CREATE TABLE user_goals (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NULL,
  step_goal  INT NULL,
  sleep_goal INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
