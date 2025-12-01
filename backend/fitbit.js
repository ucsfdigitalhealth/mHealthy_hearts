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
    
    // Check expiry
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

// Insert daily Fitbit data into the database according to scheme in README
async function saveDailyFitbitData(userId, daily) {
  const {
    date,
    steps,
    minutesLightlyActive,
    minutesFairlyActive,
    minutesVeryActive,
    totalMinutesAsleep,
    totalTimeInBed,
    sleepEfficiency
  } = daily;

  await db.execute(
    `INSERT INTO fitbit_daily_data
      (user_id, date, steps, minutes_lightly_active, minutes_fairly_active, minutes_very_active,
       total_minutes_asleep, total_time_in_bed, sleep_efficiency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
        steps = VALUES(steps),
        minutes_lightly_active = VALUES(minutes_lightly_active),
        minutes_fairly_active = VALUES(minutes_fairly_active),
        minutes_very_active = VALUES(minutes_very_active),
        total_minutes_asleep = VALUES(total_minutes_asleep),
        total_time_in_bed = VALUES(total_time_in_bed),
        sleep_efficiency = VALUES(sleep_efficiency)
    `,
    [
      userId,
      date,
      steps,
      minutesLightlyActive,
      minutesFairlyActive,
      minutesVeryActive,
      totalMinutesAsleep,
      totalTimeInBed,
      sleepEfficiency
    ]
  );

  console.log(`Saved daily Fitbit data for ${date}`);
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
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error in fitbit/connect:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Route 2: Callback (handles code/state; exchanges for tokens)
router.get('/fitbit/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) {
    return res.status(400).send('Authorization failed: No code provided.');
  }

  try {
    // Look up the user and PKCE verifier by state from database
    const [userRows] = await db.execute(
      'SELECT id, fitbit_pkce_verifier FROM user_auth_testing WHERE fitbit_oauth_state = ?',
      [state]
    );

    if (userRows.length === 0) {
      return res.status(400).send('Authorization failed: Invalid state.');
    }

    const userId = userRows[0].id;
    const code_verifier = userRows[0].fitbit_pkce_verifier;

    if (!code_verifier) {
      return res.status(400).send('Authorization failed: PKCE verifier not found.');
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

    // Store in DB and clear temporary PKCE data
    await db.execute(
      'UPDATE user_auth_testing SET fitbit_access_token = ?, fitbit_refresh_token = ?, fitbit_token_expires = ?, fitbit_pkce_verifier = NULL, fitbit_oauth_state = NULL WHERE id = ?',
      [access_token, refresh_token, expiresAt, userId]
    );

    console.log(`Fitbit connected for user ${userId}; Granted scopes: ${scope}`);

    res.redirect(`${process.env.FRONTEND_URL}/dashboard?fitbit=connected`);
  } catch (error) {
    console.error('Fitbit callback error:', error.response?.data || error.message);
    if (error.response?.data?.error === 'invalid_request') {
      console.log('Troubleshoot: Verify PKCE and params');
    }
    res.redirect(`${process.env.FRONTEND_URL}/error?msg=fitbit_failed&details=${encodeURIComponent(error.message)}`);
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

// Route 4: Fetch Heart Rate Data
router.get('/fitbit/data', verifyTokenOrRefresh, async (req, res) => {
  try {
    // Use helper function to ensure we have a valid access token
    const fitbit_access_token = await ensureValidAccessToken(req.user.userId);

    // Fetch heart rate
    const today = new Date().toISOString().split('T')[0];
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
  try {
    // Use helper function to ensure we have a valid access token
    const fitbit_access_token = await ensureValidAccessToken(req.user.userId);

    // Fetch steps data
    const today = new Date().toISOString().split('T')[0];
    const dataResponse = await axios.get(
      `https://api.fitbit.com/1/user/-/activities/steps/date/${today}/7d.json`,
      { headers: { Authorization: `Bearer ${fitbit_access_token}` } }
    );

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

// Route 6: Fetch Activity Summary (includes lightlyActive, fairlyActive, veryActive, and sleep)
router.get('/fitbit/activitySummary', verifyTokenOrRefresh, async (req, res) => {
  try {
    // Use helper function to ensure we have a valid access token
    const fitbit_access_token = await ensureValidAccessToken(req.user.userId);

    // Calculate date range for last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6); // 7 days total (including today)
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Generate array of dates for sleep data fetching
    const dates = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    // Fetch all activity metrics for the date range
    const [lightlyActiveRes, fairlyActiveRes, veryActiveRes, stepsRes, ...sleepResArray] = await Promise.all([
      axios.get(`https://api.fitbit.com/1/user/-/activities/minutesLightlyActive/date/${startDateStr}/${endDateStr}.json`,
        { headers: { Authorization: `Bearer ${fitbit_access_token}` } }),
      axios.get(`https://api.fitbit.com/1/user/-/activities/minutesFairlyActive/date/${startDateStr}/${endDateStr}.json`,
        { headers: { Authorization: `Bearer ${fitbit_access_token}` } }),
      axios.get(`https://api.fitbit.com/1/user/-/activities/minutesVeryActive/date/${startDateStr}/${endDateStr}.json`,
        { headers: { Authorization: `Bearer ${fitbit_access_token}` } }),
      axios.get(`https://api.fitbit.com/1/user/-/activities/steps/date/${startDateStr}/${endDateStr}.json`,
        { headers: { Authorization: `Bearer ${fitbit_access_token}` } }),
      // Fetch sleep data for each date in parallel
      ...dates.map(date => 
        axios.get(`https://api.fitbit.com/1.2/user/-/sleep/date/${date}.json`,
          { headers: { Authorization: `Bearer ${fitbit_access_token}` } })
          .catch(err => {
            // If sleep data is not available for a date (404 or other errors), return empty data structure
            if (err.response?.status === 404 || err.response?.status === 204) {
              // No sleep data available for this date
              return { data: { sleep: [], summary: { totalMinutesAsleep: 0, totalTimeInBed: 0 } } };
            }
            // For other errors, log and return empty structure
            console.log(`Error fetching sleep data for ${date}:`, err.response?.status || err.message);
            return { data: { sleep: [], summary: { totalMinutesAsleep: 0, totalTimeInBed: 0 } } };
          })
      )
    ]);

    // Extract data from responses
    const lightlyActive = lightlyActiveRes.data['activities-minutesLightlyActive'] || [];
    const fairlyActive = fairlyActiveRes.data['activities-minutesFairlyActive'] || [];
    const veryActive = veryActiveRes.data['activities-minutesVeryActive'] || [];
    const steps = stepsRes.data['activities-steps'] || [];

    // Combine data by date
    const activityData = {};
    
    // Process activity metrics
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

    // Process sleep data
    sleepResArray.forEach((sleepRes, index) => {
      const date = dates[index];
      if (!activityData[date]) {
        activityData[date] = { date };
      }
      
      const sleepData = sleepRes.data || sleepRes;
      const summary = sleepData.summary || {};
      
      // Extract sleep metrics from summary
      activityData[date].totalMinutesAsleep = summary.totalMinutesAsleep || 0;
      activityData[date].totalTimeInBed = summary.totalTimeInBed || 0;
      activityData[date].sleepEfficiency = summary.totalTimeInBed > 0 
        ? Math.round((summary.totalMinutesAsleep / summary.totalTimeInBed) * 100) 
        : 0;
    });
    
    // Convert object to array sorted by date
    const activityArray = Object.values(activityData).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // After computing activityArray (your final 7-day array)

// SAVE EACH DAY TO DB
for (const day of activityArray) {
  await saveDailyFitbitData(req.user.userId, {
    date: day.date,
    steps: parseInt(day.steps || 0),
    minutesLightlyActive: parseInt(day.minutesLightlyActive || 0),
    minutesFairlyActive: parseInt(day.minutesFairlyActive || 0),
    minutesVeryActive: parseInt(day.minutesVeryActive || 0),
    totalMinutesAsleep: parseInt(day.totalMinutesAsleep || 0),
    totalTimeInBed: parseInt(day.totalTimeInBed || 0),
    sleepEfficiency: parseInt(day.sleepEfficiency || 0)
  });
}

return res.json({
  message: 'Activity + sleep summary fetched and stored (7 days)',
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


