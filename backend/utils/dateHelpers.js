// Shared date/timezone helpers for history endpoints.
// Logic copied from fitbit.js — single source to avoid duplication across route files.

// Get client timezone from request: query param timezone or header X-Timezone
function getTimezoneFromRequest(req) {
  const fromQuery = req.query && req.query.timezone;
  const fromHeader = req.headers && req.headers['x-timezone'];
  const tz = typeof fromQuery === 'string' ? fromQuery : (typeof fromHeader === 'string' ? fromHeader : null);
  return tz && tz.trim() ? tz.trim() : null;
}

// Helper: Get YYYY-MM-DD for a given Date in server local time
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Get YYYY-MM-DD for a given Date in a specific IANA timezone (e.g. America/New_York)
function getDateStringInTimezone(date, timezone) {
  if (!timezone) return getLocalDateString(date);
  try {
    const s = date.toLocaleString('en-US', { timeZone: timezone });
    const [datePart] = s.split(',');
    const parts = datePart.trim().split('/');
    const month = parts[0];
    const day = parts[1];
    const year = parts[2];
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  } catch (e) {
    return getLocalDateString(date);
  }
}

// Helper: Get "today" in client timezone (or server local if no timezone)
function getTodayInTimezone(timezone) {
  return getDateStringInTimezone(new Date(), timezone);
}

// Helper: Subtract n calendar days from a date string (YYYY-MM-DD), returns YYYY-MM-DD
function subtractDaysLocal(dateStr, n) {
  let [y, m, d] = dateStr.split('-').map(Number);
  m -= 1; // 0-indexed month for Date
  d -= n;
  while (d < 1) {
    m -= 1;
    if (m < 0) {
      m += 12;
      y -= 1;
    }
    d += new Date(y, m + 1, 0).getDate();
  }
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

module.exports = {
  getTimezoneFromRequest,
  getLocalDateString,
  getTodayInTimezone,
  subtractDaysLocal,
};
