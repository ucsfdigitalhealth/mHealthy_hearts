-- Complete Migration: Fix blood_lipids_assessments.user_id type mismatch
-- This script fixes the column type mismatch by:
-- 1. Dropping the foreign key constraint
-- 2. Modifying the column type
-- 3. Re-adding the foreign key constraint

-- Step 1: Drop the existing foreign key constraint
-- Replace 'blood_lipids_assessments_user_id_fk' with your actual constraint name if different
ALTER TABLE blood_lipids_assessments 
DROP FOREIGN KEY blood_lipids_assessments_user_id_fk;

-- Step 2: Change user_id column type from INT to VARCHAR(36)
ALTER TABLE blood_lipids_assessments 
MODIFY COLUMN user_id VARCHAR(36) NULL;

-- Step 3: Re-add the foreign key constraint
ALTER TABLE blood_lipids_assessments 
ADD CONSTRAINT blood_lipids_assessments_user_id_fk 
FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE;

-- Verify the change
DESCRIBE blood_lipids_assessments;
