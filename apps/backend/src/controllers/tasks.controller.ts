import { Request, Response } from 'express';
import { pool } from '../config/database';

export const getTasks = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const result = await pool.query(
    `SELECT id, title, completed, priority, due_datetime, subtasks, recurrence, tags, created_at
     FROM tasks WHERE user_id = $1
     ORDER BY
       completed ASC,
       CASE WHEN due_datetime IS NULL THEN 1 ELSE 0 END ASC,
       due_datetime ASC,
       CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END ASC,
       created_at DESC`,
    [userId]
  );
  res.json({ tasks: result.rows });
};

export const createTask = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { title, priority = 'medium', due_datetime, recurrence, tags } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  const result = await pool.query(
    `INSERT INTO tasks (user_id, title, priority, due_datetime, subtasks, recurrence, tags)
     VALUES ($1, $2, $3, $4, '[]', $5, $6) RETURNING *`,
    [userId, title.trim(), priority, due_datetime || null, recurrence || null, tags || []]
  );
  res.status(201).json({ task: result.rows[0] });
};

export const updateTask = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id }  = req.params;
  const { title, completed, priority, due_datetime, subtasks, recurrence, tags } = req.body;

  const result = await pool.query(
    `UPDATE tasks
     SET title        = COALESCE($1, title),
         completed    = COALESCE($2, completed),
         priority     = COALESCE($3, priority),
         due_datetime = CASE WHEN $4::text = '__clear__' THEN NULL
                             WHEN $4 IS NOT NULL THEN $4::timestamp
                             ELSE due_datetime END,
         subtasks     = COALESCE($7::jsonb, subtasks),
         recurrence   = CASE WHEN $8::text = '__clear__' THEN NULL
                             WHEN $8 IS NOT NULL THEN $8
                             ELSE recurrence END,
         tags         = COALESCE($9, tags),
         updated_at   = NOW()
     WHERE id = $5 AND user_id = $6
     RETURNING *`,
    [title ?? null, completed ?? null, priority ?? null, due_datetime ?? null, id, userId,
     subtasks ? JSON.stringify(subtasks) : null, recurrence ?? null, tags ?? null]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Task not found' });
  res.json({ task: result.rows[0] });
};

export const deleteTask = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id }  = req.params;
  await pool.query(`DELETE FROM tasks WHERE id = $1 AND user_id = $2`, [id, userId]);
  res.json({ ok: true });
};
