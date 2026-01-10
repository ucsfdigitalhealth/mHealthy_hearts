-- Migration: Fix blood_lipids_assessments.user_id type mismatch
-- Issue: user_id is INT but should be VARCHAR(36) to match user_auth_testing.id (UUID)
-- Date: 2024
--
-- IMPORTANT: Before running this migration, find the actual foreign key constraint name:
--   SELECT CONSTRAINT_NAME 
--   FROM information_schema.KEY_COLUMN_USAGE 
--   WHERE TABLE_SCHEMA = DATABASE() 
--     AND TABLE_NAME = 'blood_lipids_assessments' 
--     AND REFERENCED_TABLE_NAME = 'user_auth_testing';
--
-- Then replace 'blood_lipids_assessments_ibfk_1' in Step 1 with the actual constraint name.

-- Step 1: Drop the foreign key constraint
-- Replace 'blood_lipids_assessments_ibfk_1' with the actual constraint name from the query above
ALTER TABLE blood_lipids_assessments 
DROP FOREIGN KEY blood_lipids_assessments_ibfk_1;

-- Step 2: Change user_id column type from INT to VARCHAR(36)
ALTER TABLE blood_lipids_assessments 
MODIFY COLUMN user_id VARCHAR(36) NULL;

-- Step 3: Re-add the foreign key constraint
ALTER TABLE blood_lipids_assessments 
ADD CONSTRAINT blood_lipids_assessments_user_id_fk 
FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE;
