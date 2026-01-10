-- Final Migration: Fix blood_lipids_assessments.user_id type mismatch
-- This script handles the complete migration with proper error handling
--
-- IMPORTANT: Run the diagnostic script first to verify column types!
-- Run: backend/migrations/diagnose_schema.sql

-- Step 1: Check if foreign key exists and drop it
-- First, find the constraint name:
SET @constraint_name = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'blood_lipids_assessments' 
    AND REFERENCED_TABLE_NAME = 'user_auth_testing'
  LIMIT 1
);

-- Drop the constraint if it exists
SET @sql = IFNULL(
  CONCAT('ALTER TABLE blood_lipids_assessments DROP FOREIGN KEY ', @constraint_name),
  'SELECT "No foreign key constraint found" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Verify current column type and modify it
-- This will show the current type
DESCRIBE blood_lipids_assessments;

-- Modify the column type to VARCHAR(36)
ALTER TABLE blood_lipids_assessments 
MODIFY COLUMN user_id VARCHAR(36) NULL;

-- Step 3: Verify the change worked
DESCRIBE blood_lipids_assessments;

-- Step 4: Re-add the foreign key constraint
ALTER TABLE blood_lipids_assessments 
ADD CONSTRAINT blood_lipids_assessments_user_id_fk 
FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE;

-- Final verification
SELECT 
    'Migration complete!' AS status,
    (SELECT DATA_TYPE FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'blood_lipids_assessments' 
       AND COLUMN_NAME = 'user_id') AS user_id_type,
    (SELECT DATA_TYPE FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'user_auth_testing' 
       AND COLUMN_NAME = 'id') AS referenced_id_type;
