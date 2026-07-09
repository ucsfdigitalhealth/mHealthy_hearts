-- Symptom Flow v1.5 Migration — PROMIS-29 expansion — 2026-06-25
-- Run manually against the mhearts database in MAMP.
--
-- Fully integrates the three remaining PROMIS-29 domains as separate per-component
-- weekly check-in instruments:
--   * promis_social_roles_4a      (symptom_key 'social_roles')      — 4-item short form, sum→T-score
--   * promis_pain_interference_4a (symptom_key 'pain_interference') — 4-item short form, sum→T-score
--   * single_item_pain_intensity  (symptom_key 'pain_intensity')    — single 0–10 numeric rating
--
-- This file does two things:
--   1. Documentary column COMMENTs on symptom_instrument_responses (section 1).
--   2. A DATA BACKFILL of weekly_symptom_plans.symptom_keys (section 2) — REQUIRED.
--
-- NO structural schema change is needed. The three instruments reuse the existing generic
-- symptom_instrument_responses table exactly like the current 7 weekly instruments.
-- Confirmed against the live schema:
--   * symptom_key   VARCHAR(60)  — fits 'social_roles' / 'pain_interference' / 'pain_intensity'
--   * instrument_id VARCHAR(60)  — fits the 3 new instrument_ids (longest = 27 chars)
--   * raw_responses JSON         — array of the per-item values (or [0–10] for pain intensity)
--   * raw_score     INT          — 4–20 for the short forms; 0–10 for pain intensity
--   * t_score       DECIMAL(5,2) NULL — populated for the 2 short forms; NULL for pain intensity
--   * severity_label ENUM(...) NULL    — unused by these 3 (HFRDIS only)
--
-- But weekly_symptom_plans.symptom_keys is a JSON array frozen at plan-creation time, so
-- rows created before v1.5 still hold only the old 7 keys. Without section 2 those users
-- keep a 7-key plan forever — and worse, editing a reminder re-PUTs the stale array
-- (SymptomsLanding -> WeeklyReminderSetup), permanently dropping the 3 new domains.
--
-- Every statement below is idempotent and safe to re-run: the UPDATEs report
-- "Rows matched: 0" on a second run.


-- =============================================================================
-- 1. Documentary column comments (no data touched)
-- =============================================================================

ALTER TABLE symptom_instrument_responses
  MODIFY COLUMN instrument_id VARCHAR(60) NOT NULL
    COMMENT 'e.g. promis_*_4a, mmrc, hfrdis, single_item_* (incl. v1.5 social_roles/pain_interference/pain_intensity)',
  MODIFY COLUMN t_score DECIMAL(5,2) NULL
    COMMENT 'PROMIS short-form T-score; NULL for mMRC, HFRDIS, and single_item_pain_intensity';


-- =============================================================================
-- 2. Backfill existing weekly plans with the 3 new symptom_keys
-- =============================================================================
-- One guarded UPDATE per key. The JSON_CONTAINS guard makes each statement idempotent, and
-- means we only ever APPEND — hot_flashes is never touched, so a user who deselected it
-- (MHE-5) stays deselected.
--
-- Use JSON_CONTAINS, NOT JSON_SEARCH: JSON_SEARCH matches its search string with LIKE
-- semantics, where '_' is a single-character wildcard — and every key here contains an
-- underscore. JSON_CONTAINS does an exact array-element match with no wildcards.
--
-- Appending puts the new keys after hot_flashes rather than in canonical display order.
-- That is intentional: buildSymptomQueue() in
-- frontend/src/screens/symptoms/weeklySymptomOptions.ts sorts by WEEKLY_SYMPTOM_OPTIONS
-- order, so screen order does not depend on stored array order.
--
-- No is_active filter: inactive rows are rare (DELETE /weekly-plan hard-deletes) and
-- backfilling them is harmless.
--
-- Requires MySQL 5.7+ for JSON_CONTAINS / JSON_ARRAY_APPEND. MAMP ships mysql57 and mysql80.

UPDATE weekly_symptom_plans
   SET symptom_keys = JSON_ARRAY_APPEND(symptom_keys, '$', 'social_roles')
 WHERE NOT JSON_CONTAINS(symptom_keys, '"social_roles"');

UPDATE weekly_symptom_plans
   SET symptom_keys = JSON_ARRAY_APPEND(symptom_keys, '$', 'pain_interference')
 WHERE NOT JSON_CONTAINS(symptom_keys, '"pain_interference"');

UPDATE weekly_symptom_plans
   SET symptom_keys = JSON_ARRAY_APPEND(symptom_keys, '$', 'pain_intensity')
 WHERE NOT JSON_CONTAINS(symptom_keys, '"pain_intensity"');

-- Verification query — every row should now contain the 3 new keys. Rows whose user
-- deselected hot flashes will have 9 keys; all others 10.
--
--   SELECT id, user_id, JSON_LENGTH(symptom_keys) AS n, symptom_keys
--     FROM weekly_symptom_plans;
--
-- Expected side effect: a user who already completed all 7 instruments this week flips
-- back to completed_this_week = false until they answer the 3 new screens, because
-- GET /weekly-plan compares the distinct response count against symptom_keys.length.


-- Reference only — the canonical list of weekly symptom_keys lives in
-- backend/config/instruments.js (WEEKLY_INSTRUMENT_KEYS). As of v1.5 it is:
--   fatigue, anxiety, depression_mood, sleep_disturbance, reduced_exercise_tolerance,
--   social_roles, pain_interference, pain_intensity, breathlessness_activity, hot_flashes
-- weekly_symptom_plans.symptom_keys is a JSON array (no DDL change needed for the new keys).
