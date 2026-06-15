const API_BASE = 'http://localhost:3000/api/symptoms';

export interface SymptomEventPayload {
  symptom_key: string;
  symptom_label: string;
  tracking_type: string;
  occurred_at: string;       // ISO string
  duration_bucket: string;
  activities: string[];
  safety_modal_shown: boolean;
  intensity_score?: number | null;
  weight_change_direction?: 'gained' | 'lost' | 'not_sure' | null;
  weight_change_lbs?: number | null;
}

export async function postSymptomEvent(
  token: string,
  payload: SymptomEventPayload,
): Promise<{ id: number; symptom_key: string; occurred_at: string; clinical_flag?: string | null }> {
  const res = await fetch(`${API_BASE}/event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to save symptom');
  return data;
}

export interface ScheduleSlotApi {
  day_of_week: number;  // 0=Sunday … 6=Saturday
  time: string;         // "HH:MM"
}

export interface DailyTimesScheduleApi {
  times: string[]; // "HH:MM" entries
}

export interface EmaEnrollmentPayload {
  symptom_event_id: number;
  symptom_key: string;
  frequency: 'once' | 'ongoing';
  schedule?: ScheduleSlotApi[] | DailyTimesScheduleApi | null;
  schedule_type?: 'weekly_day_time' | 'daily_times';
  start_date?: string; // "YYYY-MM-DD", required when schedule_type === 'daily_times'
  end_date?: string;   // "YYYY-MM-DD", optional
}

export async function postEmaEnrollment(
  token: string,
  payload: EmaEnrollmentPayload,
): Promise<{ id: number; symptom_key: string; frequency: string; instrument_key: string }> {
  const res = await fetch(`${API_BASE}/ema-enrollment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to save enrollment');
  return data;
}

export interface InstrumentResponsePayload {
  symptom_key: string;
  instrument_id: string;
  raw_responses: number[];
  raw_score: number;
  t_score: number | null;
  severity_label?: string | null;
  enrollment_id?: number | null;
  weekly_plan_id?: number | null;
}

export async function postInstrumentResponse(
  token: string,
  payload: InstrumentResponsePayload,
): Promise<{ id: number; symptom_key: string; instrument_id: string; raw_score: number; t_score: number | null }> {
  const res = await fetch(`${API_BASE}/instrument-response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to save instrument response');
  return data;
}

// ── Weekly symptom plan ──────────────────────────────────────────────────────

export interface WeeklyPlan {
  id: number;
  symptom_keys: string[];
  day_of_week: number; // 0=Sunday … 6=Saturday
  time: string;        // "HH:MM"
  notification_channel: 'text' | 'email';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeeklyPlanPayload {
  symptom_keys: string[];
  day_of_week: number;
  time: string;
  notification_channel: 'text' | 'email';
}

export async function getWeeklyInstrumentKeys(token: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/weekly-instrument-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load weekly instrument keys');
  return data.keys;
}

export async function getWeeklyPlan(token: string): Promise<WeeklyPlan | null> {
  const res = await fetch(`${API_BASE}/weekly-plan`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load weekly plan');
  return data.plan;
}

export async function postWeeklyPlan(token: string, payload: WeeklyPlanPayload): Promise<WeeklyPlan> {
  const res = await fetch(`${API_BASE}/weekly-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to save weekly plan');
  return data.plan;
}

export async function putWeeklyPlan(token: string, payload: WeeklyPlanPayload): Promise<WeeklyPlan> {
  const res = await fetch(`${API_BASE}/weekly-plan`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update weekly plan');
  return data.plan;
}

export async function deleteWeeklyPlan(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/weekly-plan`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to delete weekly plan');
  }
}

// Fire-and-forget; swallows all errors so it never blocks the user flow.
export function logDisclaimer(token: string | null, context: 'login' | 'section_entry' | 'acute_symptom_modal'): void {
  if (!token) return;
  fetch(`${API_BASE}/disclaimer-log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ context }),
  }).catch(() => {});
}
