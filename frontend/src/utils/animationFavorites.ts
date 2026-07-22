import AsyncStorage from '@react-native-async-storage/async-storage';

const ANIMATION_FAVORITES_KEY = 'animation_favorites';

/**
 * Favorited animation IDs for the Explore & Learn library. Local-only — there
 * is no backend favorites endpoint, and animations are static content, so
 * AsyncStorage is sufficient. No TTL: favorites persist until the user removes
 * them.
 */
export async function getFavoriteAnimationIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(ANIMATION_FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export async function setFavoriteAnimationIds(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ANIMATION_FAVORITES_KEY, JSON.stringify(ids));
  } catch (err) {
    console.warn('[animationFavorites] Failed to write favorites:', err);
  }
}

/**
 * Adds or removes an animation from favorites and returns the updated list so
 * the caller can set state from a single source of truth.
 */
export async function toggleFavoriteAnimation(id: string): Promise<string[]> {
  const current = await getFavoriteAnimationIds();
  const next = current.includes(id)
    ? current.filter(existing => existing !== id)
    : [...current, id];
  await setFavoriteAnimationIds(next);
  return next;
}

export async function clearFavoriteAnimations(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ANIMATION_FAVORITES_KEY);
  } catch (err) {
    console.warn('[animationFavorites] Failed to clear favorites:', err);
  }
}
