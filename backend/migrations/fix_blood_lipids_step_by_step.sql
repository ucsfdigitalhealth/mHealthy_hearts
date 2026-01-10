-- Step-by-Step Migration: Fix blood_lipids_assessments.user_id type mismatch
-- Run each step separately and check the results before proceeding

-- ============================================================================
-- STEP 0: DIAGNOSTIC - Check current column types
-- ============================================================================
-- Run this first to see what types you currently have:

SELECT 
    'user_auth_testing.id' AS column_info,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'user_auth_testing'
  AND COLUMN_NAME = 'id';

SELECT 
    'blood_lipids_assessments.user_id' AS column_info,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'blood_lipids_assessments'
  AND COLUMN_NAME = 'user_id';

-- ============================================================================
-- STEP 1: Find and drop the foreign key constraint
-- ============================================================================
-- First, find your constraint name:
SELECT CONSTRAINT_NAME 
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'blood_lipids_assessments' 
  AND REFERENCED_TABLE_NAME = 'user_auth_testing';

-- Then drop it (replace 'YOUR_CONSTRAINT_NAME' with the name from above):
-- ALTER TABLE blood_lipids_assessments DROP FOREIGN KEY YOUR_CONSTRAINT_NAME;

-- ============================================================================
-- STEP 2: Check if there's existing data that might cause issues
-- ============================================================================
-- Check for any existing data:
SELECT COUNT(*) AS total_records, 
       COUNT(user_id) AS records_with_user_id,
       MIN(user_id) AS min_user_id,
       MAX(user_id) AS max_user_id
FROM blood_lipids_assessments;

-- ============================================================================
-- STEP 3: Modify the column type
-- ============================================================================
-- If you have existing INT data, you might need to clear it first or convert it
-- For now, let's try to modify the column:
ALTER TABLE blood_lipids_assessments 
MODIFY COLUMN user_id VARCHAR(36) NULL;

-- Verify the change:
DESCRIBE blood_lipids_assessments;

-- ============================================================================
-- STEP 4: Re-add the foreign key constraint
-- ============================================================================
-- Only run this AFTER Step 3 succeeds:
ALTER TABLE blood_lipids_assessments 
ADD CONSTRAINT blood_lipids_assessments_user_id_fk 
FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================
-- Verify both columns are now compatible:
SELECT 
    'user_auth_testing.id' AS column_name,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'user_auth_testing'
  AND COLUMN_NAME = 'id'
UNION ALL
SELECT 
    'blood_lipids_assessments.user_id' AS column_name,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'blood_lipids_assessments'
  AND COLUMN_NAME = 'user_id';
