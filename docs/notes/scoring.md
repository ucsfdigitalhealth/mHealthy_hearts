# Scoring functions, routes, and DB tables

Reference for `backend/metricCalc.js` and how each score gets from assessment
submission to the aggregate `/api/health-scores` response.

## `backend/metricCalc.js` — exported functions

Seven scoring functions, all exported, all return roughly a 0–100 scale:

- **`getBloodGlucoseScore({ testType, value, hasDiabetes = false })`** — returns `null` if `value` is missing/NaN.
  - Diabetic: only scores `testType === 'HbA1c'` — `<7.0→40, <8.0→30, <9.0→20, <10.0→10, else 0`.
  - Non-diabetic: HbA1c — `<5.7→100, ≤6.4→60, else 0`. Fasting glucose (mg/dL) — `<100→100, ≤125→60, else 0`.
- **`getBMIScore(bmiValue)`** — `<25→100, ≤29.9→70, ≤34.9→30, ≤39.9→15, else 0`.
- **`getDietScore(d)`** — takes a snake_case row matching `diet_assessments`, computes a 0–10
  MEPA point score across 10 criteria (vegetables ≥2/day, fruit ≥1/day, red meat ≤3/wk,
  fish ≥1/wk, butter ≤5/wk, beans ≥3/wk, whole grains ≥3/day, sweets ≤4/wk, fast food ≤1/wk,
  sugary drinks ≥7/wk — that last one awards a point at *high* frequency, which reads like a
  bug but is exact-as-written, don't "fix" it without checking with whoever owns the MEPA
  spec). Maps `mepaScore` → `displayScore`: `≥8→100, ≥6→80, ≥4→50, ≥2→25, else 0`. Returns
  `{ mepaScore, displayScore }`.
- **`getNonHDLScore(value)`** — `<130→100, ≤159→60, ≤189→40, ≤219→20, else 0`.
- **`getNicotineScore({ category, frequency, timeQuit, secondHandExposure })`** —
  `never→100`; `former`: `timeQuit==='5+'→100, '1+'→75, else 50`; `current`:
  `frequency==='rarely'→25, else 0`. Then subtracts 20 if `secondHandExposure` is truthy,
  floored at 0.
- **`getPhysicalActivityScore(steps, goalSteps)`** — `round(clamp(steps/goalSteps*100, 0, 100))`.
- **`getSleepScore(sleepHours)`** — `round(clamp(hours/8*100, 0, 100))`.

No `getBloodPressureScore` exists yet — blood pressure has a reserved column in
`le8_composite_scores` but no scoring function or assessment flow.

## `backend/routes/healthScores.js`

Imports all 7 functions above. `GET /api/health-scores` pulls the latest row per assessment
table (blood lipids, blood sugar, BMI, diet, smoking) plus today's Fitbit steps/goal and
yesterday's sleep, scores each, averages the non-null scores into `compositeScore`, and
upserts a snapshot into `le8_composite_scores`. Also exposes `GET /stats`, `GET /history`,
`GET /physical-activity/history`, `GET /sleep/history` for historical composites.

## Route → endpoint → table

| File | Endpoints | Table(s) |
|---|---|---|
| `bloodLipids.js` | `POST /api/blood-lipids`, `GET /score`, `GET /stats` | `blood_lipids_assessments` |
| `bloodSugar.js` | `POST /api/blood-sugar`, `GET /score`, `GET /stats` | `blood_sugar_assessments` |
| `bmi.js` | `POST /api/bmi`, `GET /score`, `GET /stats` | `bmi_assessments` + `daily_scores` |
| `diet.js` | `POST /api/diet`, `GET /today`, `GET /history` | `diet_assessments` (upsert-by-day) + `daily_scores` |
| `smoking.js` | `POST /api/smoking`, `GET /score`, `GET /stats` | `smoking_assessments` + `daily_scores` |

All routes are `verifyToken`-protected and key off `req.user.userId`.

## DB schema

`backend/migrations/full_migrate.sql` is the **authoritative consolidated schema**
(drop-and-recreate-all) — it supersedes the older per-table `*_v2.sql` migrations, notably
by adding a `score DECIMAL(5,2)` column to `blood_sugar_assessments`, `bmi_assessments`,
`blood_lipids_assessments`, and `diet_assessments` (the `*_v2.sql` files lack `score` on all
but `smoking_assessments`). If you're recreating tables locally, use `full_migrate.sql`, not
the per-table files.

All five assessment tables share the shape: `data_id CHAR(36) PK`, `user_id VARCHAR(36)`
(FK → `user_auth_testing(id)`, `ON DELETE CASCADE`), assessment-specific columns,
`commitment_to_change TINYINT(1)`, `importance INT`, `confidence INT` (only populated when
`commitment_to_change = 1`), `score DECIMAL(5,2)`, `created_at TIMESTAMP`.

- `blood_sugar_assessments` — `test_type VARCHAR(64)`, `value DECIMAL(10,2)`, `has_diabetes TINYINT(1)`.
- `bmi_assessments` — `bmi_value DECIMAL(5,2)`, `weight/height DECIMAL(7,2)`, `previous_bmi DECIMAL(5,2)`.
- `blood_lipids_assessments` — `measure_type VARCHAR(50)`, `value DECIMAL(8,2)`, `medication TINYINT(1)`.
- `diet_assessments` — 10 `DECIMAL(5,2)` diet-frequency columns (mirrors the `getDietScore` criteria).
- `smoking_assessments` — `category/frequency/time_quit/interest_in_quitting VARCHAR(20)`, `type_smoker VARCHAR(255)`, `second_hand_exposure TINYINT(1)`.

Other relevant tables: `daily_scores` (auto-increment int PK, one row per assessment
submission) and `le8_composite_scores` (`CHAR(36) PK`, one row per user per day, holds the
aggregate snapshot `healthScores.js` writes).

## UUID convention

Primary keys are **application-generated**, not DB defaults — every assessment route does
`const dataId = crypto.randomUUID();` in Node before inserting into the `CHAR(36)` PK column
(same in `healthScores.js` for `le8_composite_scores.id`). The one exception is
`user_auth_testing.id`, whose migration DDL sets `DEFAULT (uuid())` — a MySQL-generated UUID.
