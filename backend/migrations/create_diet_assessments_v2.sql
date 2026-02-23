-- Migration: Recreate diet_assessments with UUID PK and
-- commitment_to_change / importance / confidence columns.
-- Run manually via MySQL after backing up existing data.

DROP TABLE IF EXISTS diet_assessments;

CREATE TABLE diet_assessments (
  data_id              CHAR(36)      NOT NULL,
  user_id              VARCHAR(36)   NULL,
  vegetables_per_day   DECIMAL(5,2)  NULL,
  fruit_per_day        DECIMAL(5,2)  NULL,
  red_meat_per_week    DECIMAL(5,2)  NULL,
  fish_per_week        DECIMAL(5,2)  NULL,
  butter_per_week      DECIMAL(5,2)  NULL,
  beans_per_week       DECIMAL(5,2)  NULL,
  whole_grains_per_day DECIMAL(5,2)  NULL,
  sweets_per_week      DECIMAL(5,2)  NULL,
  fast_food_per_week   DECIMAL(5,2)  NULL,
  sugary_drinks_per_week DECIMAL(5,2) NULL,
  commitment_to_change TINYINT(1)    NULL,
  importance           INT           NULL,
  confidence           INT           NULL,
  created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE
);
