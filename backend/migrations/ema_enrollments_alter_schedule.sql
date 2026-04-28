-- Run this ONLY if you already ran ema_enrollments_20260428.sql before this change.
-- Replaces the single preferred_day_of_week + preferred_time columns
-- with a single schedule JSON column that holds multiple day/time pairs.

ALTER TABLE ema_enrollments
  DROP COLUMN IF EXISTS preferred_day_of_week,
  DROP COLUMN IF EXISTS preferred_time,
  ADD COLUMN schedule JSON NULL AFTER instrument_key;
