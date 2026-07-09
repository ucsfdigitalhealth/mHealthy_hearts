// Shared label map for the 10 symptoms that make up the combined weekly
// check-in. All of these are tracked automatically — there is no per-user
// selection. The set of keys is config-driven server-side via
// WEEKLY_INSTRUMENT_KEYS (backend/config/instruments.js, GET /weekly-instrument-keys);
// this file only supplies display labels + ordering.

export interface WeeklySymptomOption {
  key: string;
  label: string;
}

export const WEEKLY_SYMPTOM_OPTIONS: WeeklySymptomOption[] = [
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'anxiety', label: 'Anxiety' },
  { key: 'depression_mood', label: 'Depression / mood changes' },
  { key: 'sleep_disturbance', label: 'Sleep disturbance' },
  { key: 'reduced_exercise_tolerance', label: 'Reduced exercise tolerance' },
  { key: 'social_roles', label: 'Social roles & activities' },
  { key: 'pain_interference', label: 'Pain interference' },
  { key: 'pain_intensity', label: 'Pain intensity' },
  { key: 'breathlessness_activity', label: 'Breathlessness with activity' },
  { key: 'hot_flashes', label: 'Hot flashes' },
];

export const WEEKLY_SYMPTOM_LABELS: Record<string, string> = Object.fromEntries(
  WEEKLY_SYMPTOM_OPTIONS.map(o => [o.key, o.label])
);

export interface SymptomQueueItem {
  symptom_key: string;
  symptom_label: string;
}

const WEEKLY_SYMPTOM_ORDER: Record<string, number> = Object.fromEntries(
  WEEKLY_SYMPTOM_OPTIONS.map((o, i) => [o.key, i])
);

// Screen order always follows WEEKLY_SYMPTOM_OPTIONS, never the order the keys happen to
// be stored in. Plans backfilled by symptom_flow_v1_5 have the new PROMIS-29 keys appended
// after hot_flashes, and must still present in the same order as a freshly created plan.
// Keys with no entry in WEEKLY_SYMPTOM_OPTIONS are dropped rather than queued.
export function buildSymptomQueue(symptomKeys: string[]): SymptomQueueItem[] {
  return symptomKeys
    .filter(key => key in WEEKLY_SYMPTOM_ORDER)
    .sort((a, b) => WEEKLY_SYMPTOM_ORDER[a] - WEEKLY_SYMPTOM_ORDER[b])
    .map(key => ({
      symptom_key: key,
      symptom_label: WEEKLY_SYMPTOM_LABELS[key],
    }));
}
