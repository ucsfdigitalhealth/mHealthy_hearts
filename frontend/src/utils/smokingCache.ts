import AsyncStorage from '@react-native-async-storage/async-storage';

const SMOKING_CACHE_KEY = 'smoking_cache';

export interface SmokingCacheEntry {
  score: number | null;
  category: string | null;
  cachedAt: number;
}

/**
 * Returns cached smoking data if present. No TTL — data persists until
 * the user submits a new assessment.
 */
export async function getCachedSmoking(): Promise<SmokingCacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(SMOKING_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SmokingCacheEntry;
  } catch {
    return null;
  }
}

/**
 * Stores smoking score and category in AsyncStorage.
 * Call this immediately after a successful assessment submission.
 */
export async function setCachedSmoking(data: {
  score: number | null;
  category: string | null;
}): Promise<void> {
  try {
    const entry: SmokingCacheEntry = { ...data, cachedAt: Date.now() };
    await AsyncStorage.setItem(SMOKING_CACHE_KEY, JSON.stringify(entry));
  } catch (err) {
    console.warn('[smokingCache] Failed to write cache:', err);
  }
}

/**
 * Clears the smoking cache so the next load will fetch from the API.
 */
export async function clearSmokingCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SMOKING_CACHE_KEY);
  } catch (err) {
    console.warn('[smokingCache] Failed to clear cache:', err);
  }
}
