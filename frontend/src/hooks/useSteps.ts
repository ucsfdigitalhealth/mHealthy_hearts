import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { getCachedSteps, setCachedSteps, clearStepsCache, CACHE_TTL_MS } from '../utils/stepsCache';
import { getDeviceTimezone } from '../utils/localDate';
import { FITBIT_STEPS_LOGIN_REFRESH_KEY } from '../context/AuthContext';

const STEPS_BASE = 'http://localhost:3000/api/fitbitAuth/fitbit/steps';

// Module-level: timer keeps running across screens so backend is called at 120s even when user navigates away.
let stepsRefreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
const stepsTokenRef: { current: string | null } = { current: null };
const stepsRefreshFnRef: { current: (() => Promise<boolean>) | null } = { current: null };

function scheduleStepsRefetch(cachedAt: number): void {
  if (stepsRefreshTimeoutId != null) {
    clearTimeout(stepsRefreshTimeoutId);
    stepsRefreshTimeoutId = null;
  }
  const delay = Math.max(0, cachedAt + CACHE_TTL_MS - Date.now());
  stepsRefreshTimeoutId = setTimeout(doStepsRefetch, delay);
}

async function doStepsRefetch(): Promise<void> {
  const token = stepsTokenRef.current;
  if (!token) return;

  const cached = await getCachedSteps();
  if (cached != null) {
    const delay = Math.max(0, cached.cachedAt + CACHE_TTL_MS - Date.now());
    if (delay > 0) {
      scheduleStepsRefetch(cached.cachedAt);
      return;
    }
  }

  try {
    const tz = getDeviceTimezone();
    const url = tz ? `${STEPS_BASE}?timezone=${encodeURIComponent(tz)}` : STEPS_BASE;
    let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401 && stepsRefreshFnRef.current) {
      const refreshed = await stepsRefreshFnRef.current();
      if (refreshed) {
        const newToken = await AsyncStorage.getItem('accessToken');
        if (newToken) {
          stepsTokenRef.current = newToken;
          res = await fetch(url, { headers: { Authorization: `Bearer ${newToken}` } });
        }
      }
    }
    if (!res.ok) return;
    const data = await res.json();
    const stepsArray = data.data?.['activities-steps'];
    const lastDay =
      Array.isArray(stepsArray) && stepsArray.length > 0 ? stepsArray[stepsArray.length - 1] : null;
    const latestSteps = lastDay ? parseInt(lastDay.value, 10) : 0;
    await setCachedSteps(latestSteps);
    scheduleStepsRefetch(Date.now());
  } catch (err) {
    console.error('[useSteps] Background refetch error:', err);
    scheduleStepsRefetch(Date.now());
  }
}

export interface UseStepsResult {
  steps: string;
  stepsNumber: number;
  refresh: () => void;
  fitbitDisconnected: boolean;
}

/**
 * Fetches steps for the current user. Cache TTL 2 minutes; refetch timer runs app-wide
 * (even when navigating away), so the backend is called at 120s regardless of screen.
 */
export function useSteps(): UseStepsResult {
  const { accessToken, refreshAccessToken } = useAuth();
  const [steps, setSteps] = useState<string>('—');
  const [stepsNumber, setStepsNumber] = useState<number>(0);
  const [fitbitDisconnected, setFitbitDisconnected] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(async () => {
    await clearStepsCache();
    setRefreshTrigger(t => t + 1);
  }, []);

  useEffect(() => {
    if (!accessToken) {
      if (stepsRefreshTimeoutId != null) {
        clearTimeout(stepsRefreshTimeoutId);
        stepsRefreshTimeoutId = null;
      }
      stepsTokenRef.current = null;
      return;
    }

    stepsTokenRef.current = accessToken;
    stepsRefreshFnRef.current = refreshAccessToken;

    const loadSteps = async (): Promise<number | undefined> => {
      const cached = await getCachedSteps();
      if (cached != null) {
        setSteps(Number(cached.steps).toLocaleString());
        setStepsNumber(cached.steps);
        return cached.cachedAt;
      }

      try {
        const tz = getDeviceTimezone();
        const loginRefresh = await AsyncStorage.getItem(FITBIT_STEPS_LOGIN_REFRESH_KEY);
        const force = loginRefresh === 'true';
        if (force) await AsyncStorage.removeItem(FITBIT_STEPS_LOGIN_REFRESH_KEY);
        const params = new URLSearchParams();
        if (tz) params.set('timezone', tz);
        if (force) params.set('force', 'true');
        const url = `${STEPS_BASE}?${params.toString()}`;
        let activeToken = accessToken;
        let res = await fetch(url, { headers: { Authorization: `Bearer ${activeToken}` } });
        if (res.status === 401) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            const newToken = await AsyncStorage.getItem('accessToken');
            if (newToken) {
              activeToken = newToken;
              stepsTokenRef.current = newToken;
              res = await fetch(url, { headers: { Authorization: `Bearer ${newToken}` } });
            }
          }
        }
        if (!res.ok) {
          try {
            const errData = await res.json();
            if (errData.code === 'FITBIT_NOT_CONNECTED') setFitbitDisconnected(true);
          } catch {}
          console.error('[useSteps] Failed to fetch steps. Status:', res.status);
          return undefined;
        }
        const data = await res.json();
        const stepsArray = data.data?.['activities-steps'];
        const lastDay =
          Array.isArray(stepsArray) && stepsArray.length > 0 ? stepsArray[stepsArray.length - 1] : null;
        const latestSteps = lastDay ? parseInt(lastDay.value, 10) : 0;
        setSteps(Number(latestSteps).toLocaleString());
        setStepsNumber(latestSteps);
        await setCachedSteps(latestSteps);
        return Date.now();
      } catch (err) {
        console.error('[useSteps] Error fetching steps:', err);
        return undefined;
      }
    };

    loadSteps().then((cachedAt) => {
      if (cachedAt != null) scheduleStepsRefetch(cachedAt);
    });

    // Sync from cache every 2s when mounted so UI updates after a background refetch
    const syncInterval = setInterval(async () => {
      const cached = await getCachedSteps();
      if (cached != null) {
        setSteps(Number(cached.steps).toLocaleString());
        setStepsNumber(cached.steps);
      }
    }, 2000);

    return () => {
      clearInterval(syncInterval);
      // Do NOT clear stepsRefreshTimeoutId on unmount — timer runs across screens.
      // Only cleared when accessToken becomes null above.
    };
  }, [accessToken, refreshTrigger]);

  return { steps, stepsNumber, refresh, fitbitDisconnected };
}
