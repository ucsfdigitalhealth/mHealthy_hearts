-- Diagnostic script to check the actual column types
-- Run this to see what the current types are

-- Check user_auth_testing.id type
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'user_auth_testing'
  AND COLUMN_NAME = 'id';

-- Check blood_lipids_assessments.user_id type
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'blood_lipids_assessments'
  AND COLUMN_NAME = 'user_id';

-- Check existing foreign key constraints
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'blood_lipids_assessments'
  AND REFERENCED_TABLE_NAME = 'user_auth_testing';
