-- Simple Migration: Fix blood_lipids_assessments.user_id type mismatch
-- Run this script to fix the column type issue
-- 
-- First, find your constraint name (if you're not sure):
-- SELECT CONSTRAINT_NAME 
-- FROM information_schema.KEY_COLUMN_USAGE 
-- WHERE TABLE_SCHEMA = DATABASE() 
--   AND TABLE_NAME = 'blood_lipids_assessments' 
--   AND REFERENCED_TABLE_NAME = 'user_auth_testing';

-- Step 1: Drop the foreign key constraint
-- Replace 'blood_lipids_assessments_user_id_fk' with your actual constraint name
ALTER TABLE blood_lipids_assessments 
DROP FOREIGN KEY blood_lipids_assessments_user_id_fk;

-- Step 2: Change user_id column type from INT to VARCHAR(36)
ALTER TABLE blood_lipids_assessments 
MODIFY COLUMN user_id VARCHAR(36) NULL;

-- Step 3: Re-add the foreign key constraint
ALTER TABLE blood_lipids_assessments 
ADD CONSTRAINT blood_lipids_assessments_user_id_fk 
FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE;
