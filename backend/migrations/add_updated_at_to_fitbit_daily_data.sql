-- Add updated_at to track when a row was last written (for cache TTL)
ALTER TABLE fitbit_daily_data
ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
