import AsyncStorage from '@react-native-async-storage/async-storage';

const BMI_CACHE_KEY = 'bmi_cache';

export interface BmiCacheEntry {
  score: number | null;
  value: number | null;
  cachedAt: number;
}

/**
 * Returns cached BMI data if present. No TTL — data persists until
 * the user submits a new assessment.
 */
export async function getCachedBmi(): Promise<BmiCacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(BMI_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BmiCacheEntry;
  } catch {
    return null;
  }
}

/**
 * Stores BMI score and value in AsyncStorage.
 * Call this immediately after a successful assessment submission.
 */
export async function setCachedBmi(data: {
  score: number | null;
  value: number | null;
}): Promise<void> {
  try {
    const entry: BmiCacheEntry = { ...data, cachedAt: Date.now() };
    await AsyncStorage.setItem(BMI_CACHE_KEY, JSON.stringify(entry));
  } catch (err) {
    console.warn('[bmiCache] Failed to write cache:', err);
  }
}

/**
 * Clears the BMI cache so the next load will fetch from the API.
 */
export async function clearBmiCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BMI_CACHE_KEY);
  } catch (err) {
    console.warn('[bmiCache] Failed to clear cache:', err);
  }
}
