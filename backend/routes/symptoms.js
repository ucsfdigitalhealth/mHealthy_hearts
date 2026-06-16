const express = require('express');
const router = express.Router();
const db = require('../db.js');
const { verifyToken } = require('../auth.js');
const {
  SYMPTOM_INSTRUMENT_MAP,
  EMA_ENROLLMENT_KEYS,
  WEEKLY_INSTRUMENT_KEYS,
  lookupTScore,
} = require('../config/instruments.js');

const ALLOWED_SYMPTOM_KEYS = new Set([
  'chest_pain', 'fainted', 'irregular_heartbeat', 'racing_heart', 'light_headed',
  'fatigue', 'anxiety', 'depression_mood', 'sleep_disturbance', 'breathlessness_activity',
  'waking_sob_night', 'reduced_exercise_tolerance', 'leg_swelling', 'weight_change',
  'hot_flashes', 'stress',
]);

const ALLOWED_DURATION_BUCKETS = new Set([
  '1_min_or_less', '10_min_or_less', '1_hour_or_less', 'more_than_1_hour',
]);

const ALLOWED_TRACKING_TYPES = new Set(['event_log_only', 'event_log_ema']);

const ALLOWED_CONTEXTS = new Set(['login', 'section_entry', 'acute_symptom_modal']);

const ALLOWED_WEIGHT_DIRECTIONS = new Set(['gained', 'lost', 'not_sure']);

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// All weekly instruments are tracked together as a single combined check-in.
const MAX_WEEKLY_PLAN_SYMPTOMS = WEEKLY_INSTRUMENT_KEYS.size;

function parseWeeklyPlanRow(row) {
  if (!row) return null;
  let symptomKeys = row.symptom_keys;
  if (typeof symptomKeys === 'string') {
    try { symptomKeys = JSON.parse(symptomKeys); } catch { symptomKeys = []; }
  }
  return {
    id: row.id,
    symptom_keys: symptomKeys,
    day_of_week: row.day_of_week,
    time: row.time,
    notification_channel: row.notification_channel,
    is_active: !!row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// POST /api/symptoms/event
router.post('/event', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const {
      symptom_key,
      symptom_label,
      tracking_type,
      occurred_at,
      duration_bucket,
      activities,
      safety_modal_shown,
      intensity_score,
      weight_change_direction,
      weight_change_lbs,
    } = req.body || {};

    if (!symptom_key || !ALLOWED_SYMPTOM_KEYS.has(symptom_key)) {
      return res.status(400).json({ message: 'Invalid or missing symptom_key' });
    }
    if (!symptom_label) {
      return res.status(400).json({ message: 'symptom_label is required' });
    }
    if (!tracking_type || !ALLOWED_TRACKING_TYPES.has(tracking_type)) {
      return res.status(400).json({ message: 'Invalid or missing tracking_type' });
    }
    if (!occurred_at) {
      return res.status(400).json({ message: 'occurred_at is required' });
    }

    const occurredDate = new Date(occurred_at);
    if (isNaN(occurredDate.getTime())) {
      return res.status(400).json({ message: 'occurred_at is not a valid date' });
    }
    if (occurredDate > new Date()) {
      return res.status(400).json({ message: 'occurred_at cannot be in the future' });
    }

    if (!duration_bucket || !ALLOWED_DURATION_BUCKETS.has(duration_bucket)) {
      return res.status(400).json({ message: 'Invalid or missing duration_bucket' });
    }
    if (!Array.isArray(activities) || activities.length === 0) {
      return res.status(400).json({ message: 'activities must be a non-empty array' });
    }

    // Validate intensity_score if provided
    let intensityValue = null;
    if (intensity_score !== undefined && intensity_score !== null) {
      const n = Number(intensity_score);
      if (isNaN(n) || n < 0 || n > 10) {
        return res.status(400).json({ message: 'intensity_score must be 0–10' });
      }
      intensityValue = Math.round(n);
    }

    // Validate weight change fields if provided
    let weightDir = null;
    let weightLbs = null;
    if (weight_change_direction !== undefined && weight_change_direction !== null) {
      if (!ALLOWED_WEIGHT_DIRECTIONS.has(weight_change_direction)) {
        return res.status(400).json({ message: 'Invalid weight_change_direction' });
      }
      weightDir = weight_change_direction;
      if (weight_change_lbs !== undefined && weight_change_lbs !== null) {
        const w = parseFloat(weight_change_lbs);
        if (isNaN(w) || w < 0) {
          return res.status(400).json({ message: 'weight_change_lbs must be a non-negative number' });
        }
        weightLbs = w;
      }
    }

    const safetyBit = safety_modal_shown ? 1 : 0;
    const activitiesJson = JSON.stringify(activities);
    const mysqlOccurredAt = occurredDate.toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await db.execute(
      `INSERT INTO symptom_events
         (user_id, symptom_key, symptom_label, tracking_type, occurred_at, duration_bucket,
          activities, safety_modal_shown, intensity_score, weight_change_direction, weight_change_lbs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, symptom_key, symptom_label, tracking_type, mysqlOccurredAt, duration_bucket,
        activitiesJson, safetyBit, intensityValue, weightDir, weightLbs,
      ]
    );

    // Clinical flag: if weight gained and same-day cumulative > 2 lbs, log a warning
    let clinicalFlag = null;
    if (weightDir === 'gained' && weightLbs !== null) {
      const dayStart = new Date(occurredDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(occurredDate);
      dayEnd.setHours(23, 59, 59, 999);
      const [rows] = await db.execute(
        `SELECT COALESCE(SUM(weight_change_lbs), 0) AS total_gain
         FROM symptom_events
         WHERE user_id = ? AND symptom_key = 'weight_change'
           AND weight_change_direction = 'gained'
           AND occurred_at BETWEEN ? AND ?`,
        [
          userId,
          dayStart.toISOString().slice(0, 19).replace('T', ' '),
          dayEnd.toISOString().slice(0, 19).replace('T', ' '),
        ]
      );
      const totalGain = parseFloat(rows[0]?.total_gain || 0);
      if (totalGain > 2) {
        clinicalFlag = 'rapid_weight_gain';
        console.warn(`[symptoms] Clinical flag: rapid_weight_gain for user ${userId} — ${totalGain} lbs gained today`);
      }
    }

    return res.status(201).json({
      id: result.insertId,
      symptom_key,
      occurred_at: mysqlOccurredAt,
      clinical_flag: clinicalFlag,
    });
  } catch (error) {
    console.error('Error saving symptom event:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// GET /api/symptoms/events
router.get('/events', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const { symptom_key, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM symptom_events WHERE user_id = ?';
    const params = [userId];

    if (symptom_key && ALLOWED_SYMPTOM_KEYS.has(symptom_key)) {
      query += ' AND symptom_key = ?';
      params.push(symptom_key);
    }

    query += ' ORDER BY occurred_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await db.execute(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching symptom events:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// POST /api/symptoms/disclaimer-log
router.post('/disclaimer-log', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const { context } = req.body || {};

    if (!context || !ALLOWED_CONTEXTS.has(context)) {
      return res.status(400).json({ message: 'Invalid or missing context' });
    }

    await db.execute(
      'INSERT INTO symptom_disclaimer_log (user_id, context) VALUES (?, ?)',
      [userId, context]
    );

    return res.status(201).json({ message: 'Disclaimer log saved' });
  } catch (error) {
    console.error('Error logging disclaimer:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// GET /api/symptoms/weekly-instrument-keys
// Returns the set of symptom_keys eligible for the combined weekly check-in,
// driven by WEEKLY_INSTRUMENT_KEYS in backend/config/instruments.js.
router.get('/weekly-instrument-keys', verifyToken, async (req, res) => {
  return res.status(200).json({ keys: Array.from(WEEKLY_INSTRUMENT_KEYS) });
});

// GET /api/symptoms/weekly-plan
// Returns the user's active combined weekly symptom-tracking plan, or { plan: null }.
// Includes completed_this_week: true if any instrument response for this plan was submitted
// during the current calendar week (Sunday–Saturday).
router.get('/weekly-plan', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const [rows] = await db.execute(
      'SELECT * FROM weekly_symptom_plans WHERE user_id = ? AND is_active = 1 LIMIT 1',
      [userId]
    );
    const planRow = rows[0];
    if (!planRow) {
      return res.status(200).json({ plan: null });
    }

    const [completionRows] = await db.execute(
      `SELECT id FROM symptom_instrument_responses
         WHERE weekly_plan_id = ? AND YEARWEEK(created_at, 0) = YEARWEEK(CURDATE(), 0)
         LIMIT 1`,
      [planRow.id]
    );

    const plan = parseWeeklyPlanRow(planRow);
    plan.completed_this_week = completionRows.length > 0;
    return res.status(200).json({ plan });
  } catch (error) {
    console.error('Error fetching weekly plan:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// POST /api/symptoms/weekly-plan
// Creates the user's combined weekly symptom-tracking plan (first-time setup).
// Body: { symptom_keys: string[], day_of_week: 0-6, time: "HH:MM", notification_channel: 'text'|'email' }
router.post('/weekly-plan', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const { symptom_keys, day_of_week, time, notification_channel } = req.body || {};

    const validationError = validateWeeklyPlanBody({ symptom_keys, day_of_week, time, notification_channel });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const [existing] = await db.execute(
      'SELECT id FROM weekly_symptom_plans WHERE user_id = ? AND is_active = 1 LIMIT 1',
      [userId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'An active weekly plan already exists. Use PUT to update it.' });
    }

    const [result] = await db.execute(
      `INSERT INTO weekly_symptom_plans (user_id, symptom_keys, day_of_week, time, notification_channel)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, JSON.stringify(symptom_keys), Number(day_of_week), time, notification_channel]
    );

    const [rows] = await db.execute('SELECT * FROM weekly_symptom_plans WHERE id = ?', [result.insertId]);
    return res.status(201).json({ plan: parseWeeklyPlanRow(rows[0]) });
  } catch (error) {
    console.error('Error creating weekly plan:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// PUT /api/symptoms/weekly-plan
// Updates the user's existing active combined weekly symptom-tracking plan.
router.put('/weekly-plan', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const { symptom_keys, day_of_week, time, notification_channel } = req.body || {};

    const validationError = validateWeeklyPlanBody({ symptom_keys, day_of_week, time, notification_channel });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const [existing] = await db.execute(
      'SELECT id FROM weekly_symptom_plans WHERE user_id = ? AND is_active = 1 LIMIT 1',
      [userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'No active weekly plan found. Use POST to create one.' });
    }

    await db.execute(
      `UPDATE weekly_symptom_plans
         SET symptom_keys = ?, day_of_week = ?, time = ?, notification_channel = ?
       WHERE id = ?`,
      [JSON.stringify(symptom_keys), Number(day_of_week), time, notification_channel, existing[0].id]
    );

    const [rows] = await db.execute('SELECT * FROM weekly_symptom_plans WHERE id = ?', [existing[0].id]);
    return res.status(200).json({ plan: parseWeeklyPlanRow(rows[0]) });
  } catch (error) {
    console.error('Error updating weekly plan:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// DELETE /api/symptoms/weekly-plan
// Deactivates the user's existing active combined weekly symptom-tracking plan.
router.delete('/weekly-plan', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;

    const [existing] = await db.execute(
      'SELECT id FROM weekly_symptom_plans WHERE user_id = ? AND is_active = 1 LIMIT 1',
      [userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'No active weekly plan found.' });
    }

    await db.execute('UPDATE weekly_symptom_plans SET is_active = 0 WHERE id = ?', [existing[0].id]);

    return res.status(200).json({ message: 'Weekly plan deleted.' });
  } catch (error) {
    console.error('Error deleting weekly plan:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

function validateWeeklyPlanBody({ symptom_keys, day_of_week, time, notification_channel }) {
  if (!Array.isArray(symptom_keys) || symptom_keys.length === 0 || symptom_keys.length > MAX_WEEKLY_PLAN_SYMPTOMS) {
    return `symptom_keys must be a non-empty array of at most ${MAX_WEEKLY_PLAN_SYMPTOMS} keys`;
  }
  for (const key of symptom_keys) {
    if (!WEEKLY_INSTRUMENT_KEYS.has(key)) {
      return `Invalid weekly symptom_key: ${key}`;
    }
  }
  const dayNum = Number(day_of_week);
  if (isNaN(dayNum) || dayNum < 0 || dayNum > 6) {
    return 'day_of_week must be 0–6';
  }
  if (!time || typeof time !== 'string' || !TIME_REGEX.test(time)) {
    return 'time must be a string matching HH:MM';
  }
  if (!notification_channel || !['text', 'email'].includes(notification_channel)) {
    return 'notification_channel must be "text" or "email"';
  }
  return null;
}

// POST /api/symptoms/ema-enrollment
// schedule format (for ongoing/weekly): [{day_of_week: 0-6, time: "HH:MM"}, ...]
router.post('/ema-enrollment', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const {
      symptom_event_id,
      instrument_response_id,
      symptom_key,
      frequency,
      schedule,
      schedule_type,
      start_date,
      end_date,
      notification_channel,
    } = req.body || {};

    // At least one of symptom_event_id or instrument_response_id must be provided
    if (!symptom_event_id && !instrument_response_id) {
      return res.status(400).json({ message: 'symptom_event_id or instrument_response_id is required' });
    }
    if (!symptom_key || (!EMA_ENROLLMENT_KEYS.has(symptom_key) && !WEEKLY_INSTRUMENT_KEYS.has(symptom_key))) {
      return res.status(400).json({ message: 'Invalid or non-enrollable symptom_key' });
    }
    if (!frequency || !['once', 'ongoing', 'weekly'].includes(frequency)) {
      return res.status(400).json({ message: 'frequency must be "once", "ongoing", or "weekly"' });
    }

    if (notification_channel && !['text', 'email'].includes(notification_channel)) {
      return res.status(400).json({ message: 'notification_channel must be "text" or "email"' });
    }

    const scheduleTypeValue = schedule_type || 'weekly_day_time';
    if (!['weekly_day_time', 'daily_times'].includes(scheduleTypeValue)) {
      return res.status(400).json({ message: 'schedule_type must be "weekly_day_time" or "daily_times"' });
    }

    let scheduleJson = null;
    let startDateValue = null;
    let endDateValue = null;

    if (scheduleTypeValue === 'daily_times') {
      if (!schedule || !Array.isArray(schedule.times) || schedule.times.length === 0) {
        return res.status(400).json({ message: 'schedule.times must be a non-empty array for schedule_type "daily_times"' });
      }
      for (const t of schedule.times) {
        if (typeof t !== 'string' || !TIME_REGEX.test(t)) {
          return res.status(400).json({ message: 'Each schedule.times entry must be a string matching HH:MM' });
        }
      }
      if (!start_date || !DATE_REGEX.test(start_date) || isNaN(new Date(start_date).getTime())) {
        return res.status(400).json({ message: 'start_date is required and must be a valid YYYY-MM-DD date for schedule_type "daily_times"' });
      }
      if (end_date !== undefined && end_date !== null) {
        if (!DATE_REGEX.test(end_date) || isNaN(new Date(end_date).getTime())) {
          return res.status(400).json({ message: 'end_date must be a valid YYYY-MM-DD date' });
        }
        if (new Date(end_date) < new Date(start_date)) {
          return res.status(400).json({ message: 'end_date must be on or after start_date' });
        }
        endDateValue = end_date;
      }
      startDateValue = start_date;
      scheduleJson = JSON.stringify({ times: schedule.times });
    } else if (frequency === 'ongoing' || frequency === 'weekly') {
      if (!Array.isArray(schedule) || schedule.length === 0) {
        return res.status(400).json({ message: 'schedule must be a non-empty array for ongoing/weekly frequency' });
      }
      for (const slot of schedule) {
        const dayNum = Number(slot.day_of_week);
        if (isNaN(dayNum) || dayNum < 0 || dayNum > 6) {
          return res.status(400).json({ message: 'Each slot must have day_of_week 0–6' });
        }
        if (!slot.time || typeof slot.time !== 'string') {
          return res.status(400).json({ message: 'Each slot must have a time string (HH:MM)' });
        }
      }
      scheduleJson = JSON.stringify(schedule);
    }

    const instrument_key = SYMPTOM_INSTRUMENT_MAP[symptom_key];

    const [result] = await db.execute(
      `INSERT INTO ema_enrollments
         (user_id, symptom_event_id, instrument_response_id, symptom_key, instrument_key,
          schedule, frequency, schedule_type, start_date, end_date, notification_channel)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        symptom_event_id || null,
        instrument_response_id || null,
        symptom_key,
        instrument_key,
        scheduleJson,
        frequency,
        scheduleTypeValue,
        startDateValue,
        endDateValue,
        notification_channel || null,
      ]
    );

    return res.status(201).json({
      id: result.insertId,
      symptom_key,
      frequency,
      instrument_key,
    });
  } catch (error) {
    console.error('Error saving EMA enrollment:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// POST /api/symptoms/instrument-response
// Stores a completed weekly instrument response with computed scores.
router.post('/instrument-response', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const {
      symptom_key,
      instrument_id,
      raw_responses,
      raw_score,
      t_score,
      severity_label,
      enrollment_id,
      weekly_plan_id,
    } = req.body || {};

    if (!symptom_key || !ALLOWED_SYMPTOM_KEYS.has(symptom_key)) {
      return res.status(400).json({ message: 'Invalid or missing symptom_key' });
    }
    if (!instrument_id) {
      return res.status(400).json({ message: 'instrument_id is required' });
    }
    if (!Array.isArray(raw_responses) || raw_responses.length === 0) {
      return res.status(400).json({ message: 'raw_responses must be a non-empty array' });
    }
    if (raw_score === undefined || raw_score === null || isNaN(Number(raw_score))) {
      return res.status(400).json({ message: 'raw_score is required and must be numeric' });
    }

    // Server-side T-score validation for PROMIS instruments
    let validatedTScore = t_score !== undefined ? t_score : null;
    if (instrument_id.startsWith('promis_')) {
      const serverTScore = lookupTScore(instrument_id, Number(raw_score));
      if (serverTScore === null) {
        console.warn(`[instrument-response] T-score lookup failed for ${instrument_id} raw=${raw_score}`);
      }
      validatedTScore = serverTScore;
    }

    if (severity_label && !['mild', 'moderate', 'severe'].includes(severity_label)) {
      return res.status(400).json({ message: 'Invalid severity_label' });
    }

    const [result] = await db.execute(
      `INSERT INTO symptom_instrument_responses
         (patient_id, symptom_key, instrument_id, raw_responses, raw_score, t_score,
          severity_label, enrollment_id, weekly_plan_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        symptom_key,
        instrument_id,
        JSON.stringify(raw_responses),
        Number(raw_score),
        validatedTScore !== null ? validatedTScore : null,
        severity_label || null,
        enrollment_id || null,
        weekly_plan_id || null,
      ]
    );

    return res.status(201).json({
      id: result.insertId,
      symptom_key,
      instrument_id,
      raw_score: Number(raw_score),
      t_score: validatedTScore,
    });
  } catch (error) {
    console.error('Error saving instrument response:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

module.exports = { router };
