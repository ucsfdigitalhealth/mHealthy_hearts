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

export interface EmaEnrollmentPayload {
  symptom_event_id: number;
  symptom_key: string;
  frequency: 'once' | 'ongoing';
  schedule?: ScheduleSlotApi[] | null;
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

export interface WeeklyEnrollmentPayload {
  instrument_response_id: number;
  symptom_key: string;
  frequency: 'weekly';
  schedule: ScheduleSlotApi[];
  notification_channel: 'text' | 'email';
}

export async function postWeeklyEnrollment(
  token: string,
  payload: WeeklyEnrollmentPayload,
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
  if (!res.ok) throw new Error(data.message || 'Failed to save weekly enrollment');
  return data;
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
