import { useState, useEffect, useCallback } from 'react';
import { extApi } from '../services/api';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  deadline?: string;    // local date string (extension-only)
  due_datetime?: string; // ISO (backend)
  createdAt: string;
}

const LOCAL_KEY = 'focusflow_tasks';
const loadLocal = (): Task[] => {
  try { const r = localStorage.getItem(LOCAL_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
};
const saveLocal = (tasks: Task[]) => localStorage.setItem(LOCAL_KEY, JSON.stringify(tasks));

const toLocalTask = (t: any): Task => ({
  id:        t.id,
  title:     t.title,
  completed: t.completed,
  priority:  t.priority ?? 'medium',
  deadline:  t.due_datetime ? t.due_datetime.slice(0, 10) : undefined,
  due_datetime: t.due_datetime ?? undefined,
  createdAt: t.created_at ?? new Date().toISOString(),
});

export const useTasks = () => {
  const [tasks,   setTasks]   = useState<Task[]>(loadLocal);
  const [synced,  setSynced]  = useState(false);  // true = connected to backend
  const [syncing, setSyncing] = useState(false);

  // On mount: check token → if present, pull tasks from backend
  useEffect(() => {
    extApi.getToken().then(async (token) => {
      if (!token) return;
      setSyncing(true);
      try {
        const res = await extApi.getTasks();
        const remote: Task[] = (res.tasks ?? []).map(toLocalTask);
        setTasks(remote);
        saveLocal(remote);
        setSynced(true);
      } catch {
        // token invalid or network down → fall back to local
      } finally {
        setSyncing(false);
      }
    });
  }, []);

  // Persist locally whenever tasks change
  useEffect(() => { saveLocal(tasks); }, [tasks]);

  const addTask = useCallback(async (title: string, priority: Task['priority'] = 'medium', deadline?: string) => {
    const tempId = Date.now().toString();
    const optimistic: Task = {
      id: tempId, title, completed: false, priority,
      deadline, createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [optimistic, ...prev]);

    if (synced) {
      try {
        const res = await extApi.createTask(title, priority, deadline ? new Date(deadline).toISOString() : undefined);
        const real = toLocalTask(res.task);
        setTasks((prev) => prev.map((t) => t.id === tempId ? real : t));
        if (deadline && typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({ type: 'SCHEDULE_ALARM', id: real.id, title, deadline });
        }
        return real;
      } catch { /**/ }
    } else {
      if (deadline && typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'SCHEDULE_ALARM', id: tempId, title, deadline });
      }
    }
    return optimistic;
  }, [synced]);

  const toggleTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const next = !task.completed;
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: next } : t));
    if (synced) extApi.updateTask(id, { completed: next }).catch(() => {});
  }, [tasks, synced]);

  const deleteTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (task && typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'CANCEL_ALARM', id, title: task.title });
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (synced) extApi.deleteTask(id).catch(() => {});
  }, [tasks, synced]);

  const clearCompleted = useCallback(() => {
    const done = tasks.filter((t) => t.completed);
    setTasks((prev) => prev.filter((t) => !t.completed));
    if (synced) done.forEach((t) => extApi.deleteTask(t.id).catch(() => {}));
  }, [tasks, synced]);

  return { tasks, synced, syncing, addTask, toggleTask, deleteTask, clearCompleted };
};
