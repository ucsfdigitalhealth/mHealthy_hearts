import AsyncStorage from '@react-native-async-storage/async-storage';

const DIET_CACHE_KEY = 'diet_cache';

export interface DietCacheEntry {
  score: number | null;
  mepaScore: number | null;
  cachedAt: number;
}

/**
 * Returns cached diet data if present. No TTL — data persists until
 * the user submits a new assessment.
 */
export async function getCachedDiet(): Promise<DietCacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(DIET_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DietCacheEntry;
  } catch {
    return null;
  }
}

/**
 * Stores diet score in AsyncStorage.
 * Call this immediately after a successful assessment submission.
 */
export async function setCachedDiet(data: {
  score: number | null;
  mepaScore: number | null;
}): Promise<void> {
  try {
    const entry: DietCacheEntry = { ...data, cachedAt: Date.now() };
    await AsyncStorage.setItem(DIET_CACHE_KEY, JSON.stringify(entry));
  } catch (err) {
    console.warn('[dietCache] Failed to write cache:', err);
  }
}

/**
 * Clears the diet cache so the next load will fetch from the API.
 */
export async function clearDietCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DIET_CACHE_KEY);
  } catch (err) {
    console.warn('[dietCache] Failed to clear cache:', err);
  }
}
