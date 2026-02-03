import AsyncStorage from '@react-native-async-storage/async-storage';

const SLEEP_CACHE_KEY = 'sleep_cache_v2';
/** Cache TTL in ms (2 minutes). Re-fetch after this. */
export const CACHE_TTL_MS = 2 * 60 * 1000;

export interface SleepCacheEntry {
  minutesAsleep: number;
  timeInBed: number;
  efficiency: number;
  cachedAt: number;
}

export interface CachedSleep {
  minutesAsleep: number;
  timeInBed: number;
  efficiency: number;
  /** Timestamp when cache was written; use for scheduling next refetch at cachedAt + CACHE_TTL_MS. */
  cachedAt: number;
}

/**
 * Returns cached sleep if the cache exists and is still valid (within TTL).
 * Includes cachedAt so callers can schedule the next refetch at cachedAt + CACHE_TTL_MS.
 */
export async function getCachedSleep(): Promise<CachedSleep | null> {
  try {
    const raw = await AsyncStorage.getItem(SLEEP_CACHE_KEY);
    if (!raw) return null;
    const entry: SleepCacheEntry = JSON.parse(raw);
    const now = Date.now();
    if (now - entry.cachedAt > CACHE_TTL_MS) return null;
    return {
      minutesAsleep: entry.minutesAsleep,
      timeInBed: entry.timeInBed,
      efficiency: entry.efficiency,
      cachedAt: entry.cachedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Clears the sleep cache so the next useSleep() will fetch from the API.
 */
export async function clearSleepCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SLEEP_CACHE_KEY);
    await AsyncStorage.removeItem('sleep_cache');
  } catch (err) {
    console.warn('[sleepCache] Failed to clear cache:', err);
  }
}

/**
 * Debug: logs everything in the sleep cache (current key and legacy key) to the console.
 * Call after login when the sleep hook runs to inspect cached values.
 */
export async function debugLogSleepCache(): Promise<void> {
  try {
    const keysToCheck = [SLEEP_CACHE_KEY, 'sleep_cache'];
    for (const key of keysToCheck) {
      const raw = await AsyncStorage.getItem(key);
      if (raw == null) {
        console.log(`[sleepCache DEBUG] ${key}: (not set)`);
        continue;
      }
      const entry = JSON.parse(raw);
      const ageMs = Date.now() - (entry.cachedAt ?? 0);
      const ageSec = Math.round(ageMs / 1000);
      const valid = ageMs <= CACHE_TTL_MS;
      console.log(`[sleepCache DEBUG] ${key}:`, {
        ...entry,
        _ageSeconds: ageSec,
        _valid: valid,
        _ttlSeconds: CACHE_TTL_MS / 1000,
      });
    }
  } catch (err) {
    console.warn('[sleepCache DEBUG] Failed to read cache:', err);
  }
}

/**
 * Stores sleep metrics and current timestamp in AsyncStorage.
 */
export async function setCachedSleep(
  minutesAsleep: number,
  timeInBed: number,
  efficiency: number
): Promise<void> {
  try {
    const entry: SleepCacheEntry = {
      minutesAsleep,
      timeInBed,
      efficiency,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(SLEEP_CACHE_KEY, JSON.stringify(entry));
  } catch (err) {
    console.warn('[sleepCache] Failed to write cache:', err);
  }
}
