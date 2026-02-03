// fitbit.js
const express = require('express');
const db = require('./db');
const axios = require('axios');
const qs = require('qs');
const crypto = require('crypto');
const { verifyTokenOrRefresh } = require('./auth');
require('dotenv').config();

const router = express.Router();

// Debug endpoint to check configuration

// Helper: Generate PKCE values
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { code_verifier: verifier, code_challenge: challenge };
}

// Helper: Generate secure state
function generateState(userId) {
  return crypto.randomBytes(32).toString('hex');
}

// --- Date/time and client timezone ---
// Routes accept timezone from frontend (query ?timezone=America/New_York or header X-Timezone).
// If provided, all "today" / "yesterday" / bed date use that timezone; otherwise server local.

// Current instant in UTC as MySQL DATETIME string (YYYY-MM-DD HH:mm:ss) — app-controlled, not MySQL CURRENT_TIMESTAMP
function getCurrentUTCDateTime() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

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

// Helper: Ensure valid access token (checks expiry and refreshes if needed)
async function ensureValidAccessToken(userId) {
  try {
    const [userRows] = await db.execute('SELECT fitbit_access_token, fitbit_refresh_token, fitbit_token_expires FROM user_auth_testing WHERE id = ?', [userId]);
    
    if (!userRows.length) {
      throw new Error('User not found');
    }
    
    let { fitbit_access_token, fitbit_refresh_token, fitbit_token_expires } = userRows[0];
    
    if (!fitbit_access_token) {
      throw new Error('Fitbit not connected');
    }
    
    // Check expiry (compare instants; no timezone)
    if (new Date() > new Date(fitbit_token_expires)) {
      console.log('Fitbit token expired, refreshing...');
      
      // Auto-refresh
      const basicAuth = Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString('base64');
      const refreshRes = await axios.post('https://api.fitbit.com/oauth2/token', qs.stringify({
        grant_type: 'refresh_token',
        refresh_token: fitbit_refresh_token
      }), {
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const { access_token, refresh_token, expires_in } = refreshRes.data;
      fitbit_access_token = access_token;
      const newExpires = new Date(Date.now() + (expires_in * 1000));
      
      await db.execute(
        'UPDATE user_auth_testing SET fitbit_access_token = ?, fitbit_refresh_token = ?, fitbit_token_expires = ? WHERE id = ?',
        [access_token, refresh_token || fitbit_refresh_token, newExpires, userId]
      );
      
      console.log('Fitbit token refreshed successfully');
    }
    
    return fitbit_access_token;
  } catch (error) {
    console.error('Error ensuring valid access token:', error.message);
    throw error;
  }
}

// Insert daily Fitbit data into the database (activity only; sleep is in fitbit_sleep_data)
async function saveDailyFitbitData(userId, daily) {
  const {
    date,
    steps,
    minutesLightlyActive,
    minutesFairlyActive,
    minutesVeryActive
  } = daily;
  const updatedAt = getCurrentUTCDateTime();

  await db.execute(
    `INSERT INTO fitbit_daily_data
      (user_id, date, steps, minutes_lightly_active, minutes_fairly_active, minutes_very_active, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
        steps = VALUES(steps),
        minutes_lightly_active = VALUES(minutes_lightly_active),
        minutes_fairly_active = VALUES(minutes_fairly_active),
        minutes_very_active = VALUES(minutes_very_active),
        updated_at = VALUES(updated_at)
    `,
    [
      userId,
      date,
      steps,
      minutesLightlyActive,
      minutesFairlyActive,
      minutesVeryActive,
      updatedAt
    ]
  );

  console.log(`Saved daily Fitbit data for ${date}`);
}

// Get YYYY-MM-DD for a Fitbit ISO timestamp (e.g. startTime) — used for "bed date".
// Fitbit sends startTime/endTime in device-local time (no Z). We use the date part (YYYY-MM-DD)
// as the bed date. If the string has a timezone (Z or ±HH:MM), we parse the instant and format
// in the given timezone (or server local).
function getBedDateInTimezone(isoString, timezone) {
  if (!isoString) return null;
  const hasTz = isoString.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(isoString);
  if (hasTz) {
    const date = new Date(isoString);
    return getDateStringInTimezone(date, timezone);
  }
  // Device-local: bed date is the date part of the string
  const datePart = isoString.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : getDateStringInTimezone(new Date(isoString), timezone);
}

// Insert or update sleep data (keyed by bed date in local time)
async function saveSleepData(userId, row) {
  const { date, totalMinutesAsleep, totalTimeInBed, sleepEfficiency } = row;
  const dataId = crypto.randomUUID();
  const updatedAt = getCurrentUTCDateTime();
  await db.execute(
    `INSERT INTO fitbit_sleep_data
      (data_id, user_id, date, total_minutes_asleep, total_time_in_bed, sleep_efficiency, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
        total_minutes_asleep = VALUES(total_minutes_asleep),
        total_time_in_bed = VALUES(total_time_in_bed),
        sleep_efficiency = VALUES(sleep_efficiency),
        updated_at = VALUES(updated_at)
    `,
    [dataId, userId, date, totalMinutesAsleep, totalTimeInBed, sleepEfficiency ?? 0, updatedAt]
  );
  console.log(`Saved sleep data for bed date ${date}`);
}

// Route 1: Connect to Fitbit (protected; generates PKCE/state)
router.get('/fitbit/connect', verifyTokenOrRefresh, async (req, res) => {
  try {
    console.log('req.user:', req.user);
    console.log('req.user.userId:', req.user?.userId);
    
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Invalid token: userId not found' });
    }

    const { code_verifier, code_challenge } = generatePKCE();
    const state = generateState(req.user.userId);

    // Store PKCE verifier and state in database
    await db.execute(
      'UPDATE user_auth_testing SET fitbit_pkce_verifier = ?, fitbit_oauth_state = ? WHERE id = ?',
      [code_verifier, state, req.user.userId]
    );

    const scope = 'activity heartrate profile sleep';
    const redirectUri = `${process.env.BASE_URL}/api/fitbitAuth/fitbit/callback`;
    
    // Debug logging
    console.log('=== Fitbit OAuth Configuration ===');
    console.log('BASE_URL:', process.env.BASE_URL);
    console.log('Redirect URI:', redirectUri);
    console.log('Client ID:', process.env.FITBIT_CLIENT_ID);
    console.log('Scope:', scope);
    console.log('================================');
    
    const authUrl = `https://www.fitbit.com/oauth2/authorize?` +
      qs.stringify({
        response_type: 'code',
        client_id: process.env.FITBIT_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: scope,
        state: state,
        code_challenge: code_challenge,
        code_challenge_method: 'S256'
      }, { format: 'RFC1738' });

    console.log('Full Auth URL:', authUrl);
    res.json({
      message: 'Authorization URL generated',
      authUrl: authUrl // Send the generated URL to the React Native app
    });
  } catch (error) {
    console.error('Error in fitbit/connect:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Route 2: Callback (handles code/state; exchanges for tokens)
router.get('/fitbit/callback', async (req, res) => {
  const { code, state } = req.query;
  console.log('=== Fitbit Callback Received ===');
  console.log('Code:', code ? 'present' : 'missing');
  console.log('State:', state);
  
  if (!code) {
    return res.status(400).send('Authorization failed: No code provided.');
  }

  if (!state) {
    console.error('No state parameter received');
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Connection Error</title>
        </head>
        <body>
          <h2>Connection Error</h2>
          <p>Missing state parameter. You can close this browser now.</p>
        </body>
      </html>
    `);
  }

  try {
    // Look up the user and PKCE verifier by state from database
    console.log('Looking up state in database:', state);
    const [userRows] = await db.execute(
      'SELECT id, fitbit_pkce_verifier FROM user_auth_testing WHERE fitbit_oauth_state = ?',
      [state]
    );
    
    console.log('Database query result:', userRows.length > 0 ? 'Found' : 'Not found');

    if (userRows.length === 0) {
      console.error('Invalid state error - state not found in database:', state);
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Connection Error</title>
          </head>
          <body>
            <h2>Connection Error</h2>
            <p>Invalid state. You can close this browser now and try connecting again from the app.</p>
          </body>
        </html>
      `);
    }

    const userId = userRows[0].id;
    const code_verifier = userRows[0].fitbit_pkce_verifier;

    if (!code_verifier) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Connection Error</title>
          </head>
          <body>
            <h2>Connection Error</h2>
            <p>PKCE verifier not found. You can close this browser now.</p>
          </body>
        </html>
      `);
    }

    // Exchange code for tokens
    const basicAuth = Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await axios.post('https://api.fitbit.com/oauth2/token', qs.stringify({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: `${process.env.BASE_URL}/api/fitbitAuth/fitbit/callback`,
      code_verifier: code_verifier
    }), {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    // Store in DB and clear temporary PKCE data (keep deep link URL for potential future use)
    await db.execute(
      'UPDATE user_auth_testing SET fitbit_access_token = ?, fitbit_refresh_token = ?, fitbit_token_expires = ?, fitbit_pkce_verifier = NULL, fitbit_oauth_state = NULL WHERE id = ?',
      [access_token, refresh_token, expiresAt, userId]
    );

    console.log(`Fitbit connected for user ${userId}; Granted scopes: ${scope}`);

    // Simple HTML response - user will close browser manually
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Fitbit Connected</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <h2>Fitbit successfully connected. You can close this browser now.</h2>
        </body>
      </html>
    `;
    res.send(htmlResponse);
  } catch (error) {
    console.error('Fitbit callback error:', error.response?.data || error.message);
    if (error.response?.data?.error === 'invalid_request') {
      console.log('Troubleshoot: Verify PKCE and params');
    }
    
    // Simple error response - user will close browser manually
    const htmlError = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Connection Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <h2>Fitbit connection failed. You can close this browser now.</h2>
        </body>
      </html>
    `;
    res.send(htmlError);
  }
});

// Route 3: Refresh Token
router.post('/fitbit/refresh', verifyTokenOrRefresh, async (req, res) => {
  try {
    const [userRows] = await db.execute('SELECT fitbit_refresh_token FROM user_auth_testing WHERE id = ?', [req.user.userId]);
    const { fitbit_refresh_token } = userRows[0];
    if (!fitbit_refresh_token) {
      return res.status(400).json({ message: 'No refresh token' });
    }

    const basicAuth = Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString('base64');
    const refreshResponse = await axios.post('https://api.fitbit.com/oauth2/token', qs.stringify({
      grant_type: 'refresh_token',
      refresh_token: fitbit_refresh_token
    }), {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in } = refreshResponse.data;
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    await db.execute(
      'UPDATE user_auth_testing SET fitbit_access_token = ?, fitbit_refresh_token = ?, fitbit_token_expires = ? WHERE id = ?',
      [access_token, refresh_token || fitbit_refresh_token, expiresAt, req.user.userId]
    );

    res.json({ message: 'Token refreshed', access_token });
  } catch (error) {
    console.error('Refresh error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Refresh token invalid - reconnect' });
    } else {
      res.status(500).json({ message: 'Server Error' });
    }
  }
});

// Route: Check Fitbit Connection
// Route 4: Fetch Heart Rate Data
router.get('/fitbit/data', verifyTokenOrRefresh, async (req, res) => {
  try {
    const fitbit_access_token = await ensureValidAccessToken(req.user.userId);
    const tz = getTimezoneFromRequest(req);
    const today = getTodayInTimezone(tz);
    const dataResponse = await axios.get(
      `https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1d/1sec.json`,
      { headers: { Authorization: `Bearer ${fitbit_access_token}` } }
    );

    console.log('Fitbit API Response:', JSON.stringify(dataResponse.data, null, 2));

    const heartData = dataResponse.data?.['activities-heart-intraday']?.dataset || [];
    const latestRate = heartData.length > 0 ? heartData[heartData.length - 1].value : null;

    res.json({
      message: 'Data fetched',
      latestHeartRate: latestRate,
      dataset: heartData.slice(-10),
      rawResponse: dataResponse.data
    });
  } catch (error) {
    console.error('Data fetch error:', error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.message === 'Fitbit not connected') {
      return res.status(400).json({ message: error.message });
    }
    
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Token invalid - reconnect or refresh' });
    } else if (error.response?.status === 403) {
      res.status(403).json({ message: 'Insufficient scopes - re-authorize with more permissions' });
    } else {
      res.status(500).json({ message: 'Server Error' });
    }
  }
});

// Route 5: Fetch Steps
router.get('/fitbit/steps', verifyTokenOrRefresh, async (req, res) => {
  console.log('[DEBUG] GET /fitbit/steps called', new Date().toISOString());
  try {
    const fitbit_access_token = await ensureValidAccessToken(req.user.userId);
    const tz = getTimezoneFromRequest(req);
    const today = getTodayInTimezone(tz);

    // Check fitbit_daily_data for today's steps; use cache if present and < 30 minutes old
    const [rows] = await db.execute(
      'SELECT steps, updated_at FROM fitbit_daily_data WHERE user_id = ? AND date = ? ORDER BY updated_at DESC LIMIT 1',
      [req.user.userId, today]
    );
    const cached = rows[0];
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000); // elapsed time
    const useCache = cached && cached.updated_at != null && new Date(cached.updated_at) > thirtyMinutesAgo;

    if (useCache) {
      const data = {
        'activities-steps': [{ dateTime: today, value: String(cached.steps) }]
      };
      return res.json({ message: 'Steps data fetched', data });
    }

    const dataResponse = await axios.get(
      `https://api.fitbit.com/1/user/-/activities/steps/date/${today}/1d.json`,
      { headers: { Authorization: `Bearer ${fitbit_access_token}` } }
    );

    // Persist steps for today so we can serve from DB next time (until > 30 minutes old)
    const stepsValue = dataResponse.data['activities-steps']?.[0]?.value ?? 0;
    const steps = typeof stepsValue === 'string' ? parseInt(stepsValue, 10) : (stepsValue || 0);
    const updatedAt = getCurrentUTCDateTime();
    const [updateResult] = await db.execute(
      'UPDATE fitbit_daily_data SET steps = ?, updated_at = ? WHERE user_id = ? AND date = ?',
      [steps, updatedAt, req.user.userId, today]
    );
    if (updateResult.affectedRows === 0) {
      await db.execute(
        `INSERT INTO fitbit_daily_data
          (data_id, user_id, date, steps, minutes_lightly_active, minutes_fairly_active, minutes_very_active, updated_at)
         VALUES (?, ?, ?, ?, 0, 0, 0, ?)`,
        [crypto.randomUUID(), req.user.userId, today, steps, updatedAt]
      );
    }

    res.json({
      message: 'Steps data fetched',
      data: dataResponse.data
    });
  } catch (error) {
    console.error('Steps fetch error:', error.response?.data || error.message);
    
    if (error.message === 'Fitbit not connected') {
      return res.status(400).json({ message: error.message });
    }
    
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Token invalid - reconnect or refresh' });
    } else if (error.response?.status === 403) {
      res.status(403).json({ message: 'Insufficient scopes - re-authorize with more permissions' });
    } else {
      res.status(500).json({ message: 'Server Error' });
    }
  }
});

// Route 5b: Fetch Sleep (yesterday's sleep — the night that ended this morning)
// Fitbit returns sleep by date you woke up (dateOfSleep); we store by bed date (local) from startTime.
// We request sleep that ended today to get "last night's" sleep.
router.get('/fitbit/sleep', verifyTokenOrRefresh, async (req, res) => {
  console.log('[DEBUG] GET /fitbit/sleep called', new Date().toISOString());
  try {
    const fitbit_access_token = await ensureValidAccessToken(req.user.userId);
    const tz = getTimezoneFromRequest(req);
    const todayLocal = getTodayInTimezone(tz);
    const yesterdayLocal = subtractDaysLocal(todayLocal, 1);

    // Check fitbit_sleep_data for yesterday's sleep (bed date); use cache if < 30 minutes old
    const [rows] = await db.execute(
      'SELECT date, total_minutes_asleep, total_time_in_bed, sleep_efficiency, updated_at FROM fitbit_sleep_data WHERE user_id = ? AND date = ? ORDER BY updated_at DESC LIMIT 1',
      [req.user.userId, yesterdayLocal]
    );
    const cached = rows[0];
    const thirtyMinutesAgo = new Date(new Date().getTime() - 30 * 60 * 1000); // elapsed time
    const useCache = cached && cached.updated_at != null && new Date(cached.updated_at) > thirtyMinutesAgo;

    if (useCache) {
      const payload = {
        message: 'Sleep data fetched (cached)',
        bedDate: yesterdayLocal,
        data: {
          sleep: [{
            dateOfSleep: yesterdayLocal,
            minutesAsleep: cached.total_minutes_asleep,
            timeInBed: cached.total_time_in_bed,
            efficiency: cached.sleep_efficiency
          }],
          summary: {
            totalMinutesAsleep: cached.total_minutes_asleep,
            totalTimeInBed: cached.total_time_in_bed,
            totalSleepEfficiency: cached.sleep_efficiency ?? 0
          }
        }
      };
      return res.json(payload);
    }

    // Request sleep for last 2 days [yesterday, today]; only return data when bed date matches yesterday (e.g. 2/1 when today is 2/2)
    const sleepRes = await axios.get(
      `https://api.fitbit.com/1.2/user/-/sleep/date/${yesterdayLocal}/${todayLocal}.json`,
      { headers: { Authorization: `Bearer ${fitbit_access_token}` } }
    ).catch(err => {
      if (err.response?.status === 404 || err.response?.status === 204) {
        return { data: { sleep: [] } };
      }
      throw err;
    });

    const sleepList = sleepRes.data?.sleep ?? [];
    let yesterdaySleep = null;

    for (const log of sleepList) {
      const bedDateLocal = getBedDateInTimezone(log.startTime, tz);
      if (!bedDateLocal) continue;

      const totalMinutesAsleep = log.minutesAsleep ?? 0;
      const totalTimeInBed = log.timeInBed ?? 0;
      const sleepEfficiency = totalTimeInBed > 0
        ? Math.round((totalMinutesAsleep / totalTimeInBed) * 100)
        : (log.efficiency ?? 0);

      await saveSleepData(req.user.userId, {
        date: bedDateLocal,
        totalMinutesAsleep,
        totalTimeInBed,
        sleepEfficiency
      });

      if (bedDateLocal === yesterdayLocal) {
        yesterdaySleep = {
          dateOfSleep: log.dateOfSleep,
          startTime: log.startTime,
          minutesAsleep: totalMinutesAsleep,
          timeInBed: totalTimeInBed,
          efficiency: sleepEfficiency
        };
      }
    }

    // Only return sleep when it matches yesterday's date (bed date === yesterdayLocal); otherwise return 0
    const totalMinutesAsleep = yesterdaySleep?.minutesAsleep ?? 0;
    const totalTimeInBed = yesterdaySleep?.timeInBed ?? 0;
    const sleepEfficiency = yesterdaySleep?.efficiency ?? 0;

    res.json({
      message: 'Sleep data fetched',
      bedDate: yesterdayLocal,
      data: {
        sleep: yesterdaySleep ? [yesterdaySleep] : [],
        summary: {
          totalMinutesAsleep,
          totalTimeInBed,
          totalSleepEfficiency: sleepEfficiency
        }
      }
    });
  } catch (error) {
    console.error('Sleep fetch error:', error.response?.data || error.message);

    if (error.message === 'Fitbit not connected') {
      return res.status(400).json({ message: error.message });
    }
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Token invalid - reconnect or refresh' });
    } else if (error.response?.status === 403) {
      res.status(403).json({ message: 'Insufficient scopes - re-authorize with more permissions' });
    } else {
      res.status(500).json({ message: 'Server Error' });
    }
  }
});

// Route 6: Fetch Activity Summary (activity only; sleep is in /fitbit/sleep and fitbit_sleep_data)
router.get('/fitbit/activitySummary', verifyTokenOrRefresh, async (req, res) => {
  try {
    const fitbit_access_token = await ensureValidAccessToken(req.user.userId);
    const tz = getTimezoneFromRequest(req);
    const endDateStr = getTodayInTimezone(tz);
    const startDateStr = subtractDaysLocal(endDateStr, 6);

    // Fetch activity metrics only (sleep is in /fitbit/sleep and fitbit_sleep_data)
    const [lightlyActiveRes, fairlyActiveRes, veryActiveRes, stepsRes] = await Promise.all([
      axios.get(`https://api.fitbit.com/1/user/-/activities/minutesLightlyActive/date/${startDateStr}/${endDateStr}.json`,
        { headers: { Authorization: `Bearer ${fitbit_access_token}` } }),
      axios.get(`https://api.fitbit.com/1/user/-/activities/minutesFairlyActive/date/${startDateStr}/${endDateStr}.json`,
        { headers: { Authorization: `Bearer ${fitbit_access_token}` } }),
      axios.get(`https://api.fitbit.com/1/user/-/activities/minutesVeryActive/date/${startDateStr}/${endDateStr}.json`,
        { headers: { Authorization: `Bearer ${fitbit_access_token}` } }),
      axios.get(`https://api.fitbit.com/1/user/-/activities/steps/date/${startDateStr}/${endDateStr}.json`,
        { headers: { Authorization: `Bearer ${fitbit_access_token}` } })
    ]);

    // Extract data from responses
    const lightlyActive = lightlyActiveRes.data['activities-minutesLightlyActive'] || [];
    const fairlyActive = fairlyActiveRes.data['activities-minutesFairlyActive'] || [];
    const veryActive = veryActiveRes.data['activities-minutesVeryActive'] || [];
    const steps = stepsRes.data['activities-steps'] || [];

    // Combine data by date
    const activityData = {};
    
    [lightlyActive, fairlyActive, veryActive, steps].forEach((metricData, index) => {
      metricData.forEach(entry => {
        const date = entry.dateTime;
        if (!activityData[date]) {
          activityData[date] = { date };
        }
        
        switch(index) {
          case 0: activityData[date].minutesLightlyActive = entry.value; break;
          case 1: activityData[date].minutesFairlyActive = entry.value; break;
          case 2: activityData[date].minutesVeryActive = entry.value; break;
          case 3: activityData[date].steps = entry.value; break;
        }
      });
    });
    
    // Convert object to array sorted by date
    const activityArray = Object.values(activityData).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // After computing activityArray (your final 7-day array)

// SAVE EACH DAY TO DB (activity only)
for (const day of activityArray) {
  await saveDailyFitbitData(req.user.userId, {
    date: day.date,
    steps: parseInt(day.steps || 0),
    minutesLightlyActive: parseInt(day.minutesLightlyActive || 0),
    minutesFairlyActive: parseInt(day.minutesFairlyActive || 0),
    minutesVeryActive: parseInt(day.minutesVeryActive || 0)
  });
}

return res.json({
  message: 'Activity summary fetched and stored (7 days)',
  dateRange: { start: startDateStr, end: endDateStr },
  data: activityArray,
  totalDays: activityArray.length
});

   
  } catch (error) {
    console.error('Activity summary fetch error:', error.response?.data || error.message);
    
    if (error.message === 'Fitbit not connected') {
      return res.status(400).json({ message: error.message });
    }
    
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Token invalid - reconnect or refresh' });
    } else if (error.response?.status === 403) {
      res.status(403).json({ message: 'Insufficient scopes - re-authorize with more permissions' });
    } else {
      res.status(500).json({ message: 'Server Error' });
    }
  }
});

module.exports = router;

