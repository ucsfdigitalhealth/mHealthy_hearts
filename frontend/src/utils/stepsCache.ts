import AsyncStorage from '@react-native-async-storage/async-storage';

const STEPS_CACHE_KEY = 'steps_cache';
/** Cache TTL in ms (2 minutes). Re-fetch after this. */
export const CACHE_TTL_MS = 2 * 60 * 1000;

export interface StepsCacheEntry {
  steps: number;
  cachedAt: number;
}

/**
 * Returns cached steps if the cache exists and is still valid (within TTL).
 * Includes cachedAt so callers can schedule the next refetch at cachedAt + CACHE_TTL_MS.
 */
export async function getCachedSteps(): Promise<{ steps: number; cachedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(STEPS_CACHE_KEY);
    if (!raw) return null;
    const entry: StepsCacheEntry = JSON.parse(raw);
    const now = Date.now();
    if (now - entry.cachedAt > CACHE_TTL_MS) return null;
    return { steps: entry.steps, cachedAt: entry.cachedAt };
  } catch {
    return null;
  }
}

/**
 * Clears the steps cache so the next useSteps() will fetch from the API.
 */
export async function clearStepsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STEPS_CACHE_KEY);
  } catch (err) {
    console.warn('[stepsCache] Failed to clear cache:', err);
  }
}

/**
 * Stores steps and current timestamp in AsyncStorage.
 */
export async function setCachedSteps(steps: number): Promise<void> {
  try {
    const entry: StepsCacheEntry = { steps, cachedAt: Date.now() };
    await AsyncStorage.setItem(STEPS_CACHE_KEY, JSON.stringify(entry));
  } catch (err) {
    console.warn('[stepsCache] Failed to write cache:', err);
  }
}
