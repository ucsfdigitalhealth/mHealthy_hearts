import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDeviceTimezone } from '../utils/localDate';

const API_BASE = 'http://localhost:3000/api/activity';

export type TodayGoal = {
  id: number;
  goalDate: string;
  stepTarget: number;
  symptomRating: number | null;
  completedYesterday: boolean;
  goalMet: boolean;
} | null;

export interface UseActivityGoalResult {
  todayGoal: TodayGoal;
  currentStreak: number;
  longestStreak: number;
  refresh: () => void;
}

/**
 * Fetches today's step goal and streak. Caller is responsible for triggering
 * `refresh()` on focus (same pattern as useSteps/useSleep).
 */
export function useActivityGoal(): UseActivityGoalResult {
  const { accessToken } = useAuth();
  const [todayGoal, setTodayGoal] = useState<TodayGoal>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    const tz = getDeviceTimezone();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      ...(tz ? { 'X-Timezone': tz } : {}),
    };
    try {
      const [goalRes, streakRes] = await Promise.all([
        fetch(tz ? `${API_BASE}/goal-today?timezone=${encodeURIComponent(tz)}` : `${API_BASE}/goal-today`, { headers }),
        fetch(`${API_BASE}/streak`, { headers }),
      ]);
      if (goalRes.ok) {
        const data = await goalRes.json();
        setTodayGoal(data.goal || null);
      }
      if (streakRes.ok) {
        const data = await streakRes.json();
        setCurrentStreak(data.currentStreak ?? 0);
        setLongestStreak(data.longestStreak ?? 0);
      }
    } catch (e) {
      console.error('Activity fetch error:', e);
    }
  }, [accessToken]);

  return { todayGoal, currentStreak, longestStreak, refresh };
}
