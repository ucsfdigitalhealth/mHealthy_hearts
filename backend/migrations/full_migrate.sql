-- =============================================================================
-- LE8_migrations/001_le8_assessment_scores_and_composite.sql
--
-- Purpose:
--   1. Drops and recreates each LE8 assessment table, adding a `score`
--      column (DECIMAL 0–100) to every table that was missing it.
--   2. Creates `le8_composite_scores` — one row per user per day tracking
--      each component score and the overall composite LE8 score.
--
-- WARNING: All existing assessment data will be lost. Back up first.
-- Run via MySQL: source backend/LE8_migrations/001_le8_assessment_scores_and_composite.sql
-- =============================================================================


-- ─── 1. SMOKING ASSESSMENTS ──────────────────────────────────────────────────
-- Retains all existing columns from v2; `score` column already existed
-- (INT) — upgraded to DECIMAL(5,2) for consistency with other tables.

DROP TABLE IF EXISTS smoking_assessments;

CREATE TABLE smoking_assessments (
  data_id              CHAR(36)      NOT NULL,
  user_id              VARCHAR(36)   NULL,
  category             VARCHAR(20)   NULL,       -- 'current' | 'former' | 'never'
  frequency            VARCHAR(20)   NULL,       -- 'everyday' | 'somedays' | 'rarely'
  time_quit            VARCHAR(20)   NULL,       -- '<1' | '1+' | '5+'
  interest_in_quitting VARCHAR(20)   NULL,       -- '30days' | 'sometime' | 'no'
  type_smoker          VARCHAR(255)  NULL,       -- product type (e.g. cigarettes, vape)
  second_hand_exposure TINYINT(1)    NULL,       -- 1 = yes, 0 = no
  commitment_to_change TINYINT(1)    NULL,       -- 1 = yes, 0 = no
  importance           INT           NULL,       -- 0–10 slider (only if commitment = 1)
  confidence           INT           NULL,       -- 0–10 slider (only if commitment = 1)
  score                DECIMAL(5,2)  NULL,       -- component score 0–100
  created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_smoking_user_id   (user_id),
  INDEX idx_smoking_created_at (created_at)
);


-- ─── 2. BLOOD SUGAR ASSESSMENTS ──────────────────────────────────────────────

DROP TABLE IF EXISTS blood_sugar_assessments;

CREATE TABLE blood_sugar_assessments (
  data_id              CHAR(36)      NOT NULL,
  user_id              VARCHAR(36)   NULL,
  test_type            VARCHAR(64)   NULL,       -- 'fasting' | 'a1c' | etc.
  value                DECIMAL(10,2) NULL,       -- measured glucose / A1C value
  has_diabetes         TINYINT(1)    NULL,       -- 1 = yes, 0 = no
  commitment_to_change TINYINT(1)    NULL,
  importance           INT           NULL,       -- 0–10 slider (only if commitment = 1)
  confidence           INT           NULL,       -- 0–10 slider (only if commitment = 1)
  score                DECIMAL(5,2)  NULL,       -- component score 0–100
  created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_blood_sugar_user_id    (user_id),
  INDEX idx_blood_sugar_created_at (created_at)
);


-- ─── 3. BMI ASSESSMENTS ──────────────────────────────────────────────────────

DROP TABLE IF EXISTS bmi_assessments;

CREATE TABLE bmi_assessments (
  data_id              CHAR(36)      NOT NULL,
  user_id              VARCHAR(36)   NULL,
  bmi_value            DECIMAL(5,2)  NULL,       -- calculated BMI
  weight               DECIMAL(7,2)  NULL,       -- lbs
  height               DECIMAL(7,2)  NULL,       -- inches
  previous_bmi         DECIMAL(5,2)  NULL,       -- last recorded BMI for trend display
  commitment_to_change TINYINT(1)    NULL,
  importance           INT           NULL,       -- 0–10 slider (only if commitment = 1)
  confidence           INT           NULL,       -- 0–10 slider (only if commitment = 1)
  score                DECIMAL(5,2)  NULL,       -- component score 0–100
  created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_bmi_user_id    (user_id),
  INDEX idx_bmi_created_at (created_at)
);


-- ─── 4. BLOOD LIPIDS ASSESSMENTS ─────────────────────────────────────────────

DROP TABLE IF EXISTS blood_lipids_assessments;

CREATE TABLE blood_lipids_assessments (
  data_id              CHAR(36)      NOT NULL,
  user_id              VARCHAR(36)   NULL,
  measure_type         VARCHAR(50)   NULL,       -- e.g. 'non-hdl', 'total'
  value                DECIMAL(8,2)  NULL,       -- mg/dL
  medication           TINYINT(1)    NULL,       -- 1 = on cholesterol medication
  commitment_to_change TINYINT(1)    NULL,
  importance           INT           NULL,       -- 0–10 slider (only if commitment = 1)
  confidence           INT           NULL,       -- 0–10 slider (only if commitment = 1)
  score                DECIMAL(5,2)  NULL,       -- component score 0–100
  created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_blood_lipids_user_id    (user_id),
  INDEX idx_blood_lipids_created_at (created_at)
);


-- ─── 5. DIET ASSESSMENTS ─────────────────────────────────────────────────────

DROP TABLE IF EXISTS diet_assessments;

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
  importance             INT          NULL,       -- 0–10 slider (only if commitment = 1)
  confidence             INT          NULL,       -- 0–10 slider (only if commitment = 1)
  score                  DECIMAL(5,2) NULL,       -- component score 0–100
  created_at             TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_diet_user_id    (user_id),
  INDEX idx_diet_created_at (created_at)
);


-- ─── 6. FITBIT DAILY DATA (Physical Activity) ────────────────────────────────
-- Adds `physical_activity_score` to the existing activity cache table.
-- This score (0–100) is derived from the daily step count using the same
-- scoring logic as the health-scores endpoint.
-- Note: sleep columns were already split out to fitbit_sleep_data in a prior migration.

DROP TABLE IF EXISTS fitbit_daily_data;

CREATE TABLE fitbit_daily_data (
  data_id                  CHAR(36)     NOT NULL,
  user_id                  VARCHAR(36)  NOT NULL,
  date                     DATE         NOT NULL,
  steps                    INT          NOT NULL DEFAULT 0,
  minutes_lightly_active   INT          NOT NULL DEFAULT 0,
  minutes_fairly_active    INT          NOT NULL DEFAULT 0,
  minutes_very_active      INT          NOT NULL DEFAULT 0,
  physical_activity_score  DECIMAL(5,2) NULL,       -- component score 0–100
  updated_at               DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  UNIQUE KEY uk_fitbit_daily_user_date (user_id, date),
  INDEX idx_fitbit_daily_user_id (user_id),
  INDEX idx_fitbit_daily_date    (date)
);


-- ─── 7. FITBIT SLEEP DATA ────────────────────────────────────────────────────
-- Adds `sleep_score` to the existing sleep cache table.
-- This score (0–100) is derived from total_minutes_asleep using the same
-- scoring logic as the health-scores endpoint.
-- `date` = bed date in the user's local timezone (the calendar date the user went to bed).

DROP TABLE IF EXISTS fitbit_sleep_data;

CREATE TABLE fitbit_sleep_data (
  data_id              CHAR(36)     NOT NULL,
  user_id              VARCHAR(36)  NOT NULL,
  date                 DATE         NOT NULL COMMENT 'Bed date (local): calendar date when user went to bed',
  total_minutes_asleep INT          NOT NULL DEFAULT 0,
  total_time_in_bed    INT          NOT NULL DEFAULT 0,
  sleep_efficiency     DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  sleep_score          DECIMAL(5,2) NULL,           -- component score 0–100
  updated_at           DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  UNIQUE KEY uk_fitbit_sleep_user_date (user_id, date),
  INDEX idx_fitbit_sleep_user_id (user_id),
  INDEX idx_fitbit_sleep_date    (date)
);


-- ─── 8. LE8 COMPOSITE SCORES ─────────────────────────────────────────────────
-- One row per user per day. Each component score is 0–100 (NULL = not yet
-- assessed or no device data available for that day). The composite_score
-- is the average of whichever components have a value, and components_counted
-- records how many were included so callers can weight or display accordingly.

DROP TABLE IF EXISTS le8_composite_scores;

CREATE TABLE le8_composite_scores (
  id                      CHAR(36)     NOT NULL,
  user_id                 VARCHAR(36)  NOT NULL,
  score_date              DATE         NOT NULL,  -- date this snapshot represents (user local date)

  -- Individual LE8 component scores (0–100 each)
  diet_score              DECIMAL(5,2) NULL,
  physical_activity_score DECIMAL(5,2) NULL,
  nicotine_score          DECIMAL(5,2) NULL,
  sleep_score             DECIMAL(5,2) NULL,
  bmi_score               DECIMAL(5,2) NULL,
  blood_lipids_score      DECIMAL(5,2) NULL,
  blood_sugar_score       DECIMAL(5,2) NULL,
  blood_pressure_score    DECIMAL(5,2) NULL,      -- reserved; BP not yet implemented

  -- Aggregate
  composite_score         DECIMAL(5,2) NULL,      -- average of all non-NULL components
  components_counted      TINYINT      NULL,       -- how many components contributed to composite

  created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_user_score_date (user_id, score_date),   -- one row per user per day
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_composite_user_id   (user_id),
  INDEX idx_composite_score_date (score_date)
);