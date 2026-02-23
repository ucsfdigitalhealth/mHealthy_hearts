import AsyncStorage from '@react-native-async-storage/async-storage';

const BLOOD_SUGAR_CACHE_KEY = 'blood_sugar_cache';

export interface BloodSugarCacheEntry {
  score: number | null;
  value: number | null;
  testType: string | null;
  cachedAt: number;
}

/**
 * Returns cached blood sugar data if present. No TTL — data persists until
 * the user submits a new assessment.
 */
export async function getCachedBloodSugar(): Promise<BloodSugarCacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(BLOOD_SUGAR_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BloodSugarCacheEntry;
  } catch {
    return null;
  }
}

/**
 * Stores blood sugar score, value, and testType in AsyncStorage.
 * Call this immediately after a successful assessment submission.
 */
export async function setCachedBloodSugar(data: {
  score: number | null;
  value: number | null;
  testType: string | null;
}): Promise<void> {
  try {
    const entry: BloodSugarCacheEntry = { ...data, cachedAt: Date.now() };
    await AsyncStorage.setItem(BLOOD_SUGAR_CACHE_KEY, JSON.stringify(entry));
  } catch (err) {
    console.warn('[bloodSugarCache] Failed to write cache:', err);
  }
}

/**
 * Clears the blood sugar cache so the next load will fetch from the API.
 */
export async function clearBloodSugarCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BLOOD_SUGAR_CACHE_KEY);
  } catch (err) {
    console.warn('[bloodSugarCache] Failed to clear cache:', err);
  }
}
