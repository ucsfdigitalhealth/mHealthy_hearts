# AsyncStorage caching conventions

Reference for `frontend/src/utils/*Cache.ts` and how `CardioVascularScreen.tsx` uses them.

## Cache utilities

| File | Cache key | TTL | Stored shape |
|---|---|---|---|
| `stepsCache.ts` | `steps_cache` | 2 min (`CACHE_TTL_MS`), enforced in `getCachedSteps` | `{ steps: number, cachedAt: number }` |
| `sleepCache.ts` | `sleep_cache_v2` (legacy `sleep_cache` cleared on read) | 2 min, enforced in `getCachedSleep` | `{ minutesAsleep, timeInBed, efficiency, cachedAt }` |
| `bloodSugarCache.ts` | `blood_sugar_cache` | **none** — persists until the next submission | `{ score, value, testType, cachedAt }` |
| `bmiCache.ts` | `bmi_cache` | **none** | `{ score, value, cachedAt }` |
| `bloodLipidsCache.ts` | `blood_lipids_cache` | **none** | `{ score, value, measureType, cachedAt }` |
| `smokingCache.ts` | `smoking_cache` | **none** | `{ score, category, cachedAt }` |

Only `stepsCache.ts` and `sleepCache.ts` enforce a TTL. The four LE8 assessment caches are
deliberately TTL-less: a submitted assessment score should stay stable in the UI until the
user redoes that assessment, not silently expire after 2 minutes like a live metric would.

## `CardioVascularScreen.tsx` read/write pattern

- **On focus** (`useFocusEffect` → `fetchAllHealthScores`): reads all four LE8 assessment
  caches (`getCachedBloodLipids`, `getCachedBloodSugar`, `getCachedBmi`, `getCachedSmoking`,
  plus diet) to populate state immediately, before the `/api/health-scores` call resolves.
- **After a successful API call**: writes back to those same four caches
  (`setCachedBloodLipids`, `setCachedBloodSugar`, `setCachedBmi`, `setCachedSmoking`, plus diet).
- **Steps/sleep are not cached from this screen.** Activity steps and sleep score/hours only
  live in local component state (`setActivityScore`, `setActivitySteps`, `setSleepScore`,
  `setSleepDisplayHours`), sourced directly from the API response's `data.sleep` /
  `data.physicalActivity` fields — there's no `setCachedSteps`/`setCachedSleep` call here.
  Don't assume symmetry with the four assessment caches; steps/sleep caching only happens in
  the hooks that own those caches (`useSteps`, `useSleep`), not in this screen.

## When adding a new cache

Follow the assessment-cache pattern (no TTL, `{ score, ..., cachedAt }` shape) for anything
tied to a user-submitted assessment; follow the steps/sleep pattern (2-min TTL) only for data
that's actively refreshed from a live external source (Fitbit).
