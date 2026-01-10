-- Migration: Create smoking assessments table
-- Date: 2025

-- Table: smoking_assessments
CREATE TABLE IF NOT EXISTS smoking_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  category VARCHAR(20) NOT NULL, -- 'current', 'former', 'never'
  frequency VARCHAR(20) NULL, -- 'everyday', 'somedays', 'rarely' (for current smokers)
  time_quit VARCHAR(20) NULL, -- '<1', '1+', '5+' (for former smokers)
  interest_in_quitting VARCHAR(20) NULL, -- '30days', 'sometime', 'no' (for current smokers)
  score INT NOT NULL, -- 0-100 (calculated score)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_category (category)
);
