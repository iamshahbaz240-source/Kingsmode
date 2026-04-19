import { Request, Response } from 'express';
import { pool } from '../config/database';

const XP_PER_POMODORO = 25;
const XP_BONUS_FULL_SET = 50;
const getXPForNextLevel = (level: number) => level * 100;

export const startSession = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { type = 'pomodoro', duration } = req.body;

  const result = await pool.query(
    `INSERT INTO sessions (user_id, type, duration) VALUES ($1, $2, $3) RETURNING *`,
    [userId, type, duration]
  );
  res.json({ session: result.rows[0] });
};

export const completeSession = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { sessionId } = req.params;
  const { notes } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Mark session complete
    const sessionResult = await client.query(
      `UPDATE sessions SET completed = true, ended_at = NOW(), xp_earned = $1, notes = $4
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [XP_PER_POMODORO, sessionId, userId, notes || null]
    );
    if (!sessionResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Session not found' });
    }

    // Count completed pomodoros today
    const todayCount = await client.query(
      `SELECT COUNT(*) FROM sessions
       WHERE user_id = $1 AND completed = true AND type = 'pomodoro'
       AND DATE(ended_at) = CURRENT_DATE`,
      [userId]
    );
    const completedToday = parseInt(todayCount.rows[0].count);
    const bonusXP = completedToday % 4 === 0 ? XP_BONUS_FULL_SET : 0;
    const totalXP = XP_PER_POMODORO + bonusXP;

    // Update user XP, level, streak
    const userResult = await client.query(`SELECT * FROM users WHERE id = $1`, [userId]);
    const user = userResult.rows[0];
    let newXP = user.xp + totalXP;
    let newLevel = user.level;
    while (newXP >= getXPForNextLevel(newLevel)) {
      newXP -= getXPForNextLevel(newLevel);
      newLevel++;
    }

    // Streak logic
    const lastActive = user.last_active ? new Date(user.last_active) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = user.streak;
    if (!lastActive || lastActive < yesterday) {
      newStreak = 1;
    } else if (lastActive.getTime() === yesterday.getTime()) {
      newStreak = user.streak + 1;
    }

    const updatedUser = await client.query(
      `UPDATE users SET xp = $1, level = $2, streak = $3, last_active = CURRENT_DATE, updated_at = NOW()
       WHERE id = $4 RETURNING id, name, email, xp, level, streak`,
      [newXP, newLevel, newStreak, userId]
    );

    // Upsert today's streak record
    await client.query(
      `INSERT INTO streaks (user_id, date, sessions_completed, focus_minutes)
       VALUES ($1, CURRENT_DATE, 1, $2)
       ON CONFLICT (user_id, date) DO UPDATE
       SET sessions_completed = streaks.sessions_completed + 1,
           focus_minutes = streaks.focus_minutes + $2`,
      [userId, Math.floor(sessionResult.rows[0].duration / 60)]
    );

    await client.query('COMMIT');

    const leveledUp = newLevel > user.level;
    res.json({
      xpEarned: totalXP,
      bonusXP,
      leveledUp,
      user: updatedUser.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getAnalytics = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const [heatmap, totals, tasks, user, monthly] = await Promise.all([
    pool.query(
      `SELECT date::text, sessions_completed, focus_minutes
       FROM streaks
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '89 days'
       ORDER BY date`,
      [userId]
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE completed = true)                           AS total_sessions,
         COALESCE(SUM(duration) FILTER (WHERE completed = true), 0)        AS total_seconds,
         COUNT(DISTINCT DATE(started_at)) FILTER (WHERE completed = true)  AS active_days
       FROM sessions WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT COUNT(*) AS done FROM tasks WHERE user_id = $1 AND completed = true`,
      [userId]
    ),
    pool.query(
      `SELECT streak, level, xp, name FROM users WHERE id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('month', date), 'Mon') AS month,
              DATE_TRUNC('month', date)                 AS month_start,
              SUM(focus_minutes)                        AS minutes,
              SUM(sessions_completed)                   AS sessions
       FROM streaks
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '5 months'
       GROUP BY month, month_start
       ORDER BY month_start`,
      [userId]
    ),
  ]);

  res.json({
    heatmap: heatmap.rows,
    totals: {
      sessions:       parseInt(totals.rows[0].total_sessions),
      hours:          Math.floor(parseInt(totals.rows[0].total_seconds) / 3600),
      activeDays:     parseInt(totals.rows[0].active_days),
      tasksCompleted: parseInt(tasks.rows[0].done),
      streak:         user.rows[0].streak,
      level:          user.rows[0].level,
    },
    monthly: monthly.rows,
  });
};

export const getHistory = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const result = await pool.query(
    `SELECT id, type, duration, completed, started_at, ended_at, xp_earned, notes
     FROM sessions
     WHERE user_id = $1 AND completed = true
     ORDER BY ended_at DESC
     LIMIT 50`,
    [userId]
  );
  res.json({ sessions: result.rows });
};

export const getTodayStats = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE completed = true AND type = 'pomodoro') AS sessions,
       COALESCE(SUM(duration) FILTER (WHERE completed = true), 0) AS total_seconds
     FROM sessions
     WHERE user_id = $1 AND DATE(started_at) = CURRENT_DATE`,
    [userId]
  );

  const weekResult = await pool.query(
    `SELECT date, sessions_completed, focus_minutes
     FROM streaks
     WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '6 days'
     ORDER BY date`,
    [userId]
  );

  res.json({
    sessions: parseInt(result.rows[0].sessions),
    totalMinutes: Math.floor(parseInt(result.rows[0].total_seconds) / 60),
    weeklyData: weekResult.rows,
  });
};
