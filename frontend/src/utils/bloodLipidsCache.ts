import AsyncStorage from '@react-native-async-storage/async-storage';

const BLOOD_LIPIDS_CACHE_KEY = 'blood_lipids_cache';

export interface BloodLipidsCacheEntry {
  score: number | null;
  value: number | null;
  measureType: string | null;
  cachedAt: number;
}

/**
 * Returns cached blood lipids data if present. No TTL — data persists until
 * the user submits a new assessment.
 */
export async function getCachedBloodLipids(): Promise<BloodLipidsCacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(BLOOD_LIPIDS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BloodLipidsCacheEntry;
  } catch {
    return null;
  }
}

/**
 * Stores blood lipids score, value, and measureType in AsyncStorage.
 * Call this immediately after a successful assessment submission.
 */
export async function setCachedBloodLipids(data: {
  score: number | null;
  value: number | null;
  measureType: string | null;
}): Promise<void> {
  try {
    const entry: BloodLipidsCacheEntry = { ...data, cachedAt: Date.now() };
    await AsyncStorage.setItem(BLOOD_LIPIDS_CACHE_KEY, JSON.stringify(entry));
  } catch (err) {
    console.warn('[bloodLipidsCache] Failed to write cache:', err);
  }
}

/**
 * Clears the blood lipids cache so the next load will fetch from the API.
 */
export async function clearBloodLipidsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BLOOD_LIPIDS_CACHE_KEY);
  } catch (err) {
    console.warn('[bloodLipidsCache] Failed to clear cache:', err);
  }
}
