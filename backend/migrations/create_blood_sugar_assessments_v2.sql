-- Migration: Recreate blood_sugar_assessments table
-- Drops the old table and recreates with:
--   - data_id CHAR(36) primary key (UUID generated in application)
--   - new columns: has_diabetes, commitment_to_change, importance, confidence
-- NOTE: importance and confidence are only populated when commitment_to_change = 1

DROP TABLE IF EXISTS blood_sugar_assessments;

CREATE TABLE blood_sugar_assessments (
  data_id CHAR(36) NOT NULL,
  user_id VARCHAR(36) NULL,
  test_type VARCHAR(64) NULL,
  value DECIMAL(10,2) NULL,
  has_diabetes TINYINT(1) NULL,
  commitment_to_change TINYINT(1) NULL,
  importance INT NULL,
  confidence INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (data_id),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE
);
