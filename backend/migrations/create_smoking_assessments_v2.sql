-- Migration: Recreate smoking_assessments with UUID PK,
-- commitment/importance/confidence, and new assessment columns.
-- Run manually via MySQL after backing up existing data.

DROP TABLE IF EXISTS smoking_assessments;

CREATE TABLE smoking_assessments (
  data_id              CHAR(36)       NOT NULL,
  user_id              VARCHAR(36)    NULL,
  category             VARCHAR(20)    NULL,
  frequency            VARCHAR(20)    NULL,
  time_quit            VARCHAR(20)    NULL,
  interest_in_quitting VARCHAR(20)    NULL,
  score                INT            NULL,
  commitment_to_change TINYINT(1)     NULL,
  importance           INT            NULL,
  confidence           INT            NULL,
  former_smoker        INT            NULL,
  second_hand_exposure TINYINT(1)     NULL,
  type_smoker          VARCHAR(255)   NULL,
  interest_cutting     VARCHAR(255)   NULL,
  created_at           TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE
);
