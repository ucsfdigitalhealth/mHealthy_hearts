/**
 * Date utilities using the device's local timezone.
 * Use for display and for passing to the backend so all date logic uses client timezone.
 */

/**
 * Returns the device's IANA timezone (e.g. "America/New_York").
 * Pass to backend as ?timezone=... or X-Timezone header for client-timezone date logic.
 */
export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/**
 * Returns the current date/time in the device's local timezone.
 */
export function getLocalNow(): Date {
  return new Date();
}

/**
 * Returns "today" in device local time as YYYY-MM-DD.
 * Backend uses client timezone from ?timezone=... for "today" when provided.
 */
export function getTodayString(): string {
  const d = getLocalNow();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = d.getDate();
  return `${y}-${m}-${String(day).padStart(2, '0')}`;
}

/**
 * Short date for headers, e.g. "Wed 1 Sep" (local timezone).
 */
export function formatDateShort(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Long date for display, e.g. "November 22, 2025" (local timezone).
 */
export function formatDateLong(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
