const express = require('express');
const router = express.Router();
const db = require('./db');
const { verifyTokenOrRefresh } = require('./auth');

// Save or update user goals
router.post('/goals', verifyTokenOrRefresh, async (req, res) => {
  const { daily_steps_goal, sleep_goal_minutes, active_minutes_goal } = req.body;
  const userId = req.user.userId;

  await db.execute(
    `INSERT INTO user_goals
      (user_id, daily_steps_goal, sleep_goal_minutes, active_minutes_goal)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
        daily_steps_goal = VALUES(daily_steps_goal),
        sleep_goal_minutes = VALUES(sleep_goal_minutes),
        active_minutes_goal = VALUES(active_minutes_goal)
    `,
    [userId, daily_steps_goal, sleep_goal_minutes, active_minutes_goal]
  );

  res.json({ message: "Goals updated successfully" });
});

// Fetch user goals
router.get('/goals', verifyTokenOrRefresh, async (req, res) => {
  const userId = req.user.userId;

  const [rows] = await db.execute(
    `SELECT daily_steps_goal, sleep_goal_minutes, active_minutes_goal
     FROM user_goals WHERE user_id = ?`,
    [userId]
  );

  if (rows.length === 0) {
    return res.json({
      daily_steps_goal: 0,
      sleep_goal_minutes: 0,
      active_minutes_goal: 0
    });
  }

  res.json(rows[0]);
});

module.exports = router;
