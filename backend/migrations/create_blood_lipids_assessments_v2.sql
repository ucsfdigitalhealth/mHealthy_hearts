-- Blood Lipids Assessments v2
-- Run: source backend/migrations/create_blood_lipids_assessments_v2.sql
-- Changes: CHAR(36) UUID PK, adds medication, commitment_to_change, importance, confidence

DROP TABLE IF EXISTS blood_lipids_assessments;

CREATE TABLE blood_lipids_assessments (
  data_id              CHAR(36)      NOT NULL PRIMARY KEY,
  user_id              VARCHAR(36)   NOT NULL,
  measure_type         VARCHAR(50)   NOT NULL,
  value                DECIMAL(8,2),
  medication           TINYINT(1),
  commitment_to_change TINYINT(1),
  importance           INT,
  confidence           INT,
  created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);
