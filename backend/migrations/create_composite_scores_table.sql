-- Migration: Create composite_scores table for per-user, per-day total health scores
-- Date: 2026-03-14

CREATE TABLE IF NOT EXISTS composite_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  composite_score DECIMAL(6,2) NOT NULL,
  score_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_score_date (score_date)
);
