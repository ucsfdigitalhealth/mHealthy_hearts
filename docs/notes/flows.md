# LE8 assessment flow step-routing

Reference for the conditional step-routing in each `frontend/src/screens/LeFlows/*Screen.tsx`
wizard. Read this before touching step order, skip logic, or back-navigation in any of
these screens — the routing is state-machine-like and easy to break by assuming a flat
linear sequence.

## BloodSugarScreen.tsx

- `TOTAL_STEPS = 11`, **0-indexed** (steps 0–10). Header shows `Step {currentStep + 1} of {TOTAL_STEPS}`.
- `selections` keyed by step number: `1`=knowsResult, `2`=hasDiabetes, `3`=testType, `4`=value, `6`=commitment, `7`=importance, `8`=confidence. Step 5 (result) has no selection key.
- Routing:
  - `selections[1] !== 'Yes'` (no lab result) → jump to step 6, skipping 3–5.
  - `selections[2] === 'Yes'` (has diabetes) → force `testType = 'HbA1c'`, jump to step 4, skipping step 3.
  - From step 4 → `hasDiabetes ? 6 : 5` (diabetic path also skips the result screen, step 5).
  - From step 6 (commitment) → `selections[6] === 'Yes' ? 7 : 9` (skips importance/confidence straight to resources if not committing).
- Back-nav mirrors this: step 4 back → `hasDiabetes ? 2 : 3`; step 6 back → `!knowsResult ? 2 : hasDiabetes ? 4 : 5`; step 9 back → `selections[6] === 'Yes' ? 8 : 6`.

## BloodLipidsScreen.tsx

- `TOTAL_STEPS = 11`, **1-indexed** (steps 1–11).
- `handleMeasureSelect`: `type === 'no-results'` → jump to step 6, skipping value-entry (4) and result (5).
- Step 2 ("I found my results" vs "I'll check later"): "I'll check later" sets `checkLater = true` and jumps straight to step 11 (Resources), skipping the entire body of the flow.
- `handleCommitmentNext`: `commitment` truthy → step 8 (importance). Else → step 10 if a `value` was entered, else step 11 — i.e. no-commitment additionally skips the score-summary step if there's no value to score.
- `handleConfidenceNext`: same value-gated branch — step 10 if `value`, else step 11.
- **Gotcha**: render dispatch is offset from displayed step numbers — `case 5: return renderStep8()` (the result screen render function is named `renderStep8` but shown at step 5), and `case 10: return renderStep9()` (score summary). Don't assume `renderStepN` renders at step N.

## SmokingAssessmentScreen.tsx

- `TOTAL_STEPS = 12`, **0-indexed** (steps 0–11), named constants:
  `STEP_WELCOME=0, STEP_STATUS=1, STEP_FREQUENCY=2, STEP_PRODUCT_TYPE=3, STEP_INTEREST=4, STEP_TIME_QUIT=5, STEP_SECONDHAND=6, STEP_COMMITMENT=7, STEP_IMPORTANCE=8, STEP_CONFIDENCE=9, STEP_SCORE=10, STEP_RESOURCES=11`.
- From `STEP_STATUS`: `current` → `STEP_FREQUENCY`; `former` → `STEP_TIME_QUIT` (skips frequency/product/interest); `never` → `STEP_SECONDHAND` directly (skips all current/former-only steps).
- Current-smoker chain: `STEP_FREQUENCY` → `STEP_PRODUCT_TYPE` → `STEP_INTEREST` → `STEP_SECONDHAND`.
- Former-smoker chain: `STEP_TIME_QUIT` → `STEP_SECONDHAND` directly.
- From `STEP_COMMITMENT`: truthy → `STEP_IMPORTANCE`; else → `STEP_SCORE` directly (skips importance/confidence).
- Back-nav from `STEP_SECONDHAND` branches back to `STEP_INTEREST` / `STEP_TIME_QUIT` / `STEP_STATUS` depending on `smokingStatus`. Back-nav from `STEP_SCORE`: `commitment ? STEP_CONFIDENCE : STEP_COMMITMENT`.

## BmiScreen.tsx

- `TOTAL_STEPS = 8`, **string-keyed** `StepId` union (not numeric), mapped to display numbers via `STEP_NUMBERS`. Note `directBmiInput` and `heightWeightInput` share display number `3` — they're mutually exclusive branches, never both shown.
- `renderKnowsBmi`: "Yes" → `directBmiInput`; "No" → `heightWeightInput`. Both converge back at `commitment`.
- From `commitment`: `commitment === 'Yes' ? 'importance' : 'resources'` (skips importance/confidence if not committing).
- Back-nav: `commitment` back → `knowsBmi === 'Yes' ? 'directBmiInput' : 'heightWeightInput'`; `resources` back → `commitment === 'Yes' ? 'confidence' : 'commitment'`.

## Common pattern

All four flows share the same shape: a Yes/No "commitment to change" question gates whether
importance/confidence sliders (the two `CustomSlider` steps) are shown before the final
score/resources screens. If you're adding a new LE8 assessment flow, this is the pattern to
replicate.
