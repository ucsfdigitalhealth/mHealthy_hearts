// Shared label map for the 7 symptoms that make up the combined weekly
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

export function buildSymptomQueue(symptomKeys: string[]): SymptomQueueItem[] {
  return symptomKeys.map(key => ({
    symptom_key: key,
    symptom_label: WEEKLY_SYMPTOM_LABELS[key] ?? key,
  }));
}
