const express = require('express');
const router = express.Router();
const db = require('../db.js');
const { verifyToken } = require('../auth.js');
const { SYMPTOM_INSTRUMENT_MAP, EMA_ENROLLMENT_KEYS } = require('../config/instruments.js');

const ALLOWED_SYMPTOM_KEYS = new Set([
  'chest_pain', 'fainted', 'irregular_heartbeat', 'racing_heart', 'light_headed',
  'fatigue', 'anxiety', 'depression_mood', 'sleep_disturbance', 'breathlessness_activity',
  'waking_sob_night', 'reduced_exercise_tolerance', 'leg_swelling', 'weight_change', 'stress',
]);

const ALLOWED_DURATION_BUCKETS = new Set([
  '1_min_or_less', '10_min_or_less', '1_hour_or_less', 'more_than_1_hour',
]);

const ALLOWED_TRACKING_TYPES = new Set(['event_log_only', 'event_log_ema']);

const ALLOWED_CONTEXTS = new Set(['login', 'section_entry', 'acute_symptom_modal']);

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

    const safetyBit = safety_modal_shown ? 1 : 0;
    const activitiesJson = JSON.stringify(activities);
    const mysqlOccurredAt = occurredDate.toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await db.execute(
      `INSERT INTO symptom_events
         (user_id, symptom_key, symptom_label, tracking_type, occurred_at, duration_bucket, activities, safety_modal_shown)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, symptom_key, symptom_label, tracking_type, mysqlOccurredAt, duration_bucket, activitiesJson, safetyBit]
    );

    return res.status(201).json({
      id: result.insertId,
      symptom_key,
      occurred_at: mysqlOccurredAt,
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

// POST /api/symptoms/ema-enrollment
// schedule format (for ongoing): [{day_of_week: 0-6, time: "HH:MM"}, ...]
router.post('/ema-enrollment', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const { symptom_event_id, symptom_key, frequency, schedule } = req.body || {};

    if (!symptom_event_id) {
      return res.status(400).json({ message: 'symptom_event_id is required' });
    }
    if (!symptom_key || !EMA_ENROLLMENT_KEYS.has(symptom_key)) {
      return res.status(400).json({ message: 'Invalid or non-enrollable symptom_key' });
    }
    if (!frequency || !['once', 'ongoing'].includes(frequency)) {
      return res.status(400).json({ message: 'frequency must be "once" or "ongoing"' });
    }

    let scheduleJson = null;

    if (frequency === 'ongoing') {
      if (!Array.isArray(schedule) || schedule.length === 0) {
        return res.status(400).json({ message: 'schedule must be a non-empty array for ongoing frequency' });
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
         (user_id, symptom_event_id, symptom_key, instrument_key, schedule, frequency)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, symptom_event_id, symptom_key, instrument_key, scheduleJson, frequency]
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

module.exports = { router };
