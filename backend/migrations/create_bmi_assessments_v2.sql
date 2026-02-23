-- Migration: Recreate bmi_assessments with UUID PK, previous_bmi,
-- and commitment/importance/confidence columns.
-- Run manually via MySQL after backing up existing data.

DROP TABLE IF EXISTS bmi_assessments;

CREATE TABLE bmi_assessments (
  data_id            CHAR(36)       NOT NULL,
  user_id            VARCHAR(36)    NULL,
  bmi_value          DECIMAL(5,2)   NULL,
  weight             DECIMAL(7,2)   NULL,
  height             DECIMAL(7,2)   NULL,
  previous_bmi       DECIMAL(5,2)   NULL,
  commitment_to_change TINYINT(1)   NULL,
  importance         INT            NULL,
  confidence         INT            NULL,
  created_at         TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE
);
