import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { getCachedSleep, setCachedSleep, clearSleepCache, debugLogSleepCache, CACHE_TTL_MS } from '../utils/sleepCache';
import { getDeviceTimezone } from '../utils/localDate';
import { FITBIT_SLEEP_LOGIN_REFRESH_KEY } from '../context/AuthContext';

const SLEEP_BASE = 'http://localhost:3000/api/fitbitAuth/fitbit/sleep';

// Module-level: timer keeps running across screens so backend is called at 120s even when user navigates away.
let sleepRefreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
const sleepTokenRef: { current: string | null } = { current: null };

function scheduleSleepRefetch(cachedAt: number): void {
  if (sleepRefreshTimeoutId != null) {
    clearTimeout(sleepRefreshTimeoutId);
    sleepRefreshTimeoutId = null;
  }
  const delay = Math.max(0, cachedAt + CACHE_TTL_MS - Date.now());
  sleepRefreshTimeoutId = setTimeout(doSleepRefetch, delay);
}

async function doSleepRefetch(): Promise<void> {
  const token = sleepTokenRef.current;
  if (!token) return;

  const cached = await getCachedSleep();
  if (cached != null) {
    const delay = Math.max(0, cached.cachedAt + CACHE_TTL_MS - Date.now());
    if (delay > 0) {
      scheduleSleepRefetch(cached.cachedAt);
      return;
    }
  }

  try {
    const tz = getDeviceTimezone();
    const url = tz ? `${SLEEP_BASE}?timezone=${encodeURIComponent(tz)}` : SLEEP_BASE;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const json = await res.json();
    const summary = json.data?.summary;
    const sleepList = json.data?.sleep;
    const minsRaw = summary?.totalMinutesAsleep ?? sleepList?.[0]?.minutesAsleep ?? 0;
    const inBedRaw = summary?.totalTimeInBed ?? sleepList?.[0]?.timeInBed ?? 0;
    const effRaw = summary?.totalSleepEfficiency ?? sleepList?.[0]?.efficiency ?? 0;
    const mins = Number(minsRaw) || 0;
    const inBed = Number(inBedRaw) || 0;
    const eff = Math.round(Number(effRaw) || 0);
    await setCachedSleep(mins, inBed, eff);
    scheduleSleepRefetch(Date.now());
  } catch (err) {
    console.error('[useSleep] Background refetch error:', err);
    scheduleSleepRefetch(Date.now());
  }
}

export interface UseSleepResult {
  /** Minutes asleep (last night). */
  minutesAsleep: number;
  /** Hours asleep for display (e.g. LE8 "hrs"). */
  sleepHours: number;
  /** Formatted string e.g. "6 h 20 m", or "—" when no data, or "Loading…" while fetching. */
  formatted: string;
  /** LE8-style sleep score 0–100. */
  sleepScore: number;
  /** Time in bed (minutes). */
  timeInBed: number;
  /** Sleep efficiency 0–100. */
  efficiency: number;
  /** True until first fetch (from cache or network) has completed. */
  isLoading: boolean;
  /** Set when the last fetch failed (e.g. network or 401). */
  error: string | null;
  /** Clears the cache and immediately re-fetches from the backend. */
  refresh: () => void;
}

function formatMinutesToHM(minutes: number): string {
  if (minutes <= 0 || !Number.isFinite(minutes)) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (m === 0) return `${h} h`;
  return `${h} h ${m} m`;
}

function calculateSleepScore(hours: number): number {
  if (hours >= 7 && hours < 9) return 100;
  if (hours >= 9 && hours < 10) return 90;
  if (hours >= 6 && hours < 7) return 70;
  if ((hours >= 5 && hours < 6) || hours >= 10) return 40;
  if (hours >= 4 && hours < 5) return 20;
  return 0;
}

/**
 * Fetches sleep for the current user (last night). Cache TTL 2 minutes; refetch timer runs app-wide
 * (even when navigating away), so the backend is called at 120s regardless of screen.
 */
export function useSleep(): UseSleepResult {
  const { accessToken } = useAuth();
  const [minutesAsleep, setMinutesAsleep] = useState<number>(0);
  const [timeInBed, setTimeInBed] = useState<number>(0);
  const [efficiency, setEfficiency] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(async () => {
    await clearSleepCache();
    setRefreshTrigger(t => t + 1);
  }, []);

  const sleepHours = minutesAsleep / 60;
  const sleepScore = calculateSleepScore(sleepHours);
  const formatted =
    isLoading && !error
      ? 'Loading…'
      : formatMinutesToHM(minutesAsleep);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      if (sleepRefreshTimeoutId != null) {
        clearTimeout(sleepRefreshTimeoutId);
        sleepRefreshTimeoutId = null;
      }
      sleepTokenRef.current = null;
      return;
    }

    sleepTokenRef.current = accessToken;
    setError(null);

    const loadSleep = async (): Promise<number | undefined> => {
      await debugLogSleepCache();

      const cached = await getCachedSleep();
      if (cached != null) {
        setMinutesAsleep(Number(cached.minutesAsleep) || 0);
        setTimeInBed(Number(cached.timeInBed) || 0);
        setEfficiency(Math.round(Number(cached.efficiency) || 0));
        setIsLoading(false);
        return cached.cachedAt;
      }

      try {
        const tz = getDeviceTimezone();
        const loginRefresh = await AsyncStorage.getItem(FITBIT_SLEEP_LOGIN_REFRESH_KEY);
        const force = loginRefresh === 'true';
        if (force) await AsyncStorage.removeItem(FITBIT_SLEEP_LOGIN_REFRESH_KEY);
        const params = new URLSearchParams();
        if (tz) params.set('timezone', tz);
        if (force) params.set('force', 'true');
        const url = `${SLEEP_BASE}?${params.toString()}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
          const msg = `Sleep fetch failed: ${res.status}`;
          console.error('[useSleep]', msg);
          setError(msg);
          setIsLoading(false);
          return undefined;
        }
        const json = await res.json();
        const summary = json.data?.summary;
        const sleepList = json.data?.sleep;
        const minsRaw = summary?.totalMinutesAsleep ?? sleepList?.[0]?.minutesAsleep ?? 0;
        const inBedRaw = summary?.totalTimeInBed ?? sleepList?.[0]?.timeInBed ?? 0;
        const effRaw = summary?.totalSleepEfficiency ?? sleepList?.[0]?.efficiency ?? 0;
        const mins = Number(minsRaw) || 0;
        const inBed = Number(inBedRaw) || 0;
        const eff = Math.round(Number(effRaw) || 0);

        setMinutesAsleep(mins);
        setTimeInBed(inBed);
        setEfficiency(eff);
        setError(null);
        await setCachedSleep(mins, inBed, eff);
        return Date.now();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch sleep';
        console.error('[useSleep] Error fetching sleep:', err);
        setError(msg);
        return undefined;
      } finally {
        setIsLoading(false);
      }
    };

    loadSleep().then((cachedAt) => {
      if (cachedAt != null) scheduleSleepRefetch(cachedAt);
    });

    // Sync from cache every 2s when mounted so UI updates after a background refetch
    const syncInterval = setInterval(async () => {
      const cached = await getCachedSleep();
      if (cached != null) {
        setMinutesAsleep(Number(cached.minutesAsleep) || 0);
        setTimeInBed(Number(cached.timeInBed) || 0);
        setEfficiency(Math.round(Number(cached.efficiency) || 0));
      }
    }, 10000);

    return () => {
      clearInterval(syncInterval);
      // Do NOT clear sleepRefreshTimeoutId on unmount — timer runs across screens.
      // Only cleared when accessToken becomes null above.
    };
  }, [accessToken, refreshTrigger]);

  return {
    minutesAsleep,
    sleepHours,
    formatted,
    sleepScore,
    timeInBed,
    efficiency,
    isLoading,
    error,
    refresh,
  };
}
