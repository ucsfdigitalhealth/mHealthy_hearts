const API_BASE = 'http://localhost:3000/api/symptoms';

export interface SymptomEventPayload {
  symptom_key: string;
  symptom_label: string;
  tracking_type: string;
  occurred_at: string;       // ISO string
  duration_bucket: string;
  activities: string[];
  safety_modal_shown: boolean;
}

export async function postSymptomEvent(
  token: string,
  payload: SymptomEventPayload,
): Promise<{ id: number; symptom_key: string; occurred_at: string }> {
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
