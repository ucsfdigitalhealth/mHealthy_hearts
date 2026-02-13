const express = require('express');
const router = express.Router();
const db = require('../db.js');
const { verifyToken, verifyTokenOrRefresh } = require('../auth.js');

function getTimezoneFromRequest(req) {
  const fromQuery = req.query && req.query.timezone;
  const fromHeader = req.headers && req.headers['x-timezone'];
  const tz = typeof fromQuery === 'string' ? fromQuery : (typeof fromHeader === 'string' ? fromHeader : null);
  return tz && tz.trim() ? tz.trim() : null;
}

function getTodayInTimezone(timezone) {
  if (!timezone) {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  try {
    const s = new Date().toLocaleString('en-US', { timeZone: timezone });
    const [datePart] = s.split(',');
    const parts = datePart.trim().split('/');
    const month = parts[0];
    const day = parts[1];
    const year = parts[2];
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  } catch (e) {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
}

function subtractDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// GET /api/activity/goal-today
// Returns today's goal for the user (or null)
router.get('/goal-today', verifyTokenOrRefresh, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const tz = getTimezoneFromRequest(req);
    const today = getTodayInTimezone(tz);

    const [rows] = await db.execute(
      'SELECT id, goal_date, step_target, symptom_rating, completed_yesterday, goal_met, created_at FROM daily_goals WHERE user_id = ? AND goal_date = ?',
      [userId, today]
    );
    const goal = rows[0] || null;
    if (!goal) {
      return res.json({ goal: null });
    }
    return res.json({
      goal: {
        id: goal.id,
        goalDate: goal.goal_date,
        stepTarget: goal.step_target,
        symptomRating: goal.symptom_rating,
        completedYesterday: goal.completed_yesterday === 1,
        goalMet: goal.goal_met === 1,
        createdAt: goal.created_at,
      },
    });
  } catch (err) {
    console.error('Error fetching today goal:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
});

// POST /api/activity/goal
// Set today's goal. Body: { stepTarget, symptomRating?, completedYesterday? }
router.post('/goal', verifyTokenOrRefresh, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const tz = getTimezoneFromRequest(req);
    const today = getTodayInTimezone(tz);
    const { stepTarget, symptomRating, completedYesterday } = req.body || {};

    if (!stepTarget || ![5000, 5500, 6000].includes(Number(stepTarget))) {
      return res.status(400).json({ message: 'stepTarget must be 5000, 5500, or 6000' });
    }

    const symptom = symptomRating != null ? Number(symptomRating) : null;
    const completed = completedYesterday === true ? 1 : completedYesterday === false ? 0 : null;

    await db.execute(
      `INSERT INTO daily_goals (user_id, goal_date, step_target, symptom_rating, completed_yesterday)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         step_target = VALUES(step_target),
         symptom_rating = VALUES(symptom_rating),
         completed_yesterday = VALUES(completed_yesterday),
         updated_at = CURRENT_TIMESTAMP`,
      [userId, today, Number(stepTarget), symptom, completed]
    );

    return res.status(201).json({
      success: true,
      message: 'Goal set successfully',
      goal: { goalDate: today, stepTarget: Number(stepTarget), symptomRating: symptom, completedYesterday: completed === 1 },
    });
  } catch (err) {
    console.error('Error setting goal:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
});

// GET /api/activity/streak
// Returns current and longest streak
router.get('/streak', verifyTokenOrRefresh, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const [rows] = await db.execute(
      'SELECT current_streak, longest_streak, last_goal_met_date FROM activity_streaks WHERE user_id = ?',
      [userId]
    );
    const row = rows[0];
    return res.json({
      currentStreak: row ? row.current_streak : 0,
      longestStreak: row ? row.longest_streak : 0,
      lastGoalMetDate: row ? row.last_goal_met_date : null,
    });
  } catch (err) {
    console.error('Error fetching streak:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
});

// GET /api/activity/yesterday-steps
// Returns yesterday's step count (for goal flow confirmation)
router.get('/yesterday-steps', verifyTokenOrRefresh, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const tz = getTimezoneFromRequest(req);
    const today = getTodayInTimezone(tz);
    const yesterday = subtractDays(today, 1);

    const [rows] = await db.execute(
      'SELECT steps FROM fitbit_daily_data WHERE user_id = ? AND date = ? ORDER BY updated_at DESC LIMIT 1',
      [userId, yesterday]
    );
    const steps = rows[0] ? (rows[0].steps || 0) : 0;
    return res.json({ date: yesterday, steps: Number(steps) });
  } catch (err) {
    console.error('Error fetching yesterday steps:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
});

// Called by Fitbit step sync (or webhook) when steps for a date are known.
// Updates goal_met for that date and recalculates streak.
async function updateGoalAndStreakForDate(userId, dateStr, steps) {
  const [goals] = await db.execute(
    'SELECT id, step_target FROM daily_goals WHERE user_id = ? AND goal_date = ?',
    [userId, dateStr]
  );
  if (!goals.length) return;
  const goal = goals[0];
  const goalMet = steps >= goal.step_target ? 1 : 0;

  await db.execute(
    'UPDATE daily_goals SET goal_met = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [goalMet, goal.id]
  );

  if (goalMet !== 1) {
    const [existing] = await db.execute('SELECT longest_streak FROM activity_streaks WHERE user_id = ?', [userId]);
    const prevLongest = existing && existing[0] ? existing[0].longest_streak : 0;
    await db.execute(
      `INSERT INTO activity_streaks (user_id, current_streak, longest_streak, last_goal_met_date)
       VALUES (?, 0, ?, NULL)
       ON DUPLICATE KEY UPDATE
         current_streak = 0,
         last_goal_met_date = NULL,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, prevLongest]
    );
    return;
  }

  const [streakRows] = await db.execute(
    'SELECT current_streak, longest_streak, last_goal_met_date FROM activity_streaks WHERE user_id = ?',
    [userId]
  );

  function parseDate(s) {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  const prevDate = parseDate(streakRows[0]?.last_goal_met_date);
  const current = streakRows[0]?.current_streak ?? 0;
  const longest = streakRows[0]?.longest_streak ?? 0;

  let newCurrent = 1;
  if (prevDate) {
    const diffDays = Math.round((new Date(dateStr) - new Date(prevDate)) / (24 * 60 * 60 * 1000));
    if (diffDays === 1) newCurrent = current + 1;
    else if (diffDays !== 0) newCurrent = 1;
  }
  const newLongest = Math.max(longest, newCurrent);

  await db.execute(
    `INSERT INTO activity_streaks (user_id, current_streak, longest_streak, last_goal_met_date)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       current_streak = VALUES(current_streak),
       longest_streak = VALUES(longest_streak),
       last_goal_met_date = VALUES(last_goal_met_date),
       updated_at = CURRENT_TIMESTAMP`,
    [userId, newCurrent, newLongest, dateStr]
  );
}

module.exports = { router, getTodayInTimezone, subtractDays, updateGoalAndStreakForDate };
