import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../auth.js';

const router = express.Router();

// Save user goals
router.post('/', authenticateToken, async (req, res) => {
  const { step_goal, sleep_goal } = req.body;
  const user_id = req.user.id;

  if (typeof step_goal !== 'number' || typeof sleep_goal !== 'number') {
    return res.status(400).json({ error: 'Invalid goal values' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO user_goals (user_id, step_goal, sleep_goal) VALUES (?, ?, ?)',
      [user_id, step_goal, sleep_goal]
    );
    res.status(201).json({ id: result.insertId, user_id, step_goal, sleep_goal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save user goals' });
  }
});

export { router };
