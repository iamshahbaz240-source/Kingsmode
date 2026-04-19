import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckCircle2, Circle, ChevronDown, ChevronUp, Flag, Clock, ListChecks, RefreshCw } from 'lucide-react';
import { tasksApi } from '../services/api';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

type Recurrence = 'daily' | 'weekly' | 'monthly';

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  work:     { bg: 'rgba(96,165,250,0.15)',  text: '#60a5fa' },
  personal: { bg: 'rgba(167,139,250,0.15)', text: '#a78bfa' },
  learning: { bg: 'rgba(52,211,153,0.15)',  text: '#34d399' },
  health:   { bg: 'rgba(251,146,60,0.15)',  text: '#fb923c' },
  urgent:   { bg: 'rgba(239,68,68,0.15)',   text: '#f87171' },
  ideas:    { bg: 'rgba(250,204,21,0.15)',  text: '#facc15' },
};
const ALL_TAGS = Object.keys(TAG_COLORS);

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_datetime: string | null;
  subtasks: Subtask[];
  recurrence: Recurrence | null;
  tags: string[];
  created_at: string;
}

// ── Datetime helpers ───────────────────────────────────────

// Convert server UTC ISO → local datetime-local string "YYYY-MM-DDTHH:mm"
const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Local datetime-local string → ISO for server
const toISO = (local: string): string => new Date(local).toISOString();

const nowISO = () => new Date().toISOString();

// Min value for datetime-local input (now, rounded to current minute)
const minDatetimeLocal = (): string => toLocalInput(nowISO());

const dueDateStatus = (due: string | null): 'overdue' | 'today' | 'soon' | 'upcoming' | null => {
  if (!due) return null;
  const dueMs = new Date(due).getTime();
  const nowMs  = Date.now();
  if (dueMs < nowMs) return 'overdue';

  const dueDate = new Date(due);
  const today   = new Date();
  const sameDay = dueDate.toDateString() === today.toDateString();
  if (sameDay) return 'today';

  const diffH = (dueMs - nowMs) / 3600000;
  if (diffH <= 24) return 'soon';
  return 'upcoming';
};

const dueDateLabel = (due: string | null): string => {
  if (!due) return '';
  const d      = new Date(due);
  const status = dueDateStatus(due);
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const hasTime = d.getMinutes() !== 0 || d.getHours() !== 0;

  if (status === 'overdue') {
    const diffMs  = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60)  return `${diffMin}m overdue`;
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH  < 24)  return `${diffH}h overdue`;
    return `${Math.floor(diffH / 24)}d overdue`;
  }
  if (status === 'today') return hasTime ? `Today ${timeStr}` : 'Today';
  if (status === 'soon')  return hasTime ? `Tomorrow ${timeStr}` : 'Tomorrow';

  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return hasTime ? `${dateStr} ${timeStr}` : dateStr;
};

const STATUS_STYLE = {
  overdue:  { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',   text: '#f87171' },
  today:    { bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.3)',  text: '#fb923c' },
  soon:     { bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)',   text: '#facc15' },
  upcoming: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.4)' },
};

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f97316', low: '#6b7280' };
const PRIORITY_LABEL = { high: 'High',    medium: 'Medium',  low: 'Low'     };

// ── Add Task Form ──────────────────────────────────────────
const RECURRENCE_LABELS: Record<Recurrence, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

const AddTaskForm = ({ onAdd }: { onAdd: (t: Omit<Task, 'id' | 'completed' | 'created_at'>) => void }) => {
  const [title,      setTitle]      = useState('');
  const [dueLocal,   setDueLocal]   = useState('');
  const [priority,   setPriority]   = useState<Task['priority']>('medium');
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null);
  const [tags,       setTags]       = useState<string[]>([]);
  const [expanded,   setExpanded]   = useState(false);

  const toggleTag = (t: string) => setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const submit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), priority, due_datetime: dueLocal ? toISO(dueLocal) : null, subtasks: [], recurrence, tags });
    setTitle(''); setDueLocal(''); setPriority('medium'); setRecurrence(null); setTags([]); setExpanded(false);
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <Plus className="w-4 h-4 text-white/25 shrink-0" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          onFocus={() => setExpanded(true)}
          placeholder="Add a task..."
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/20"
        />
        {title && (
          <button onClick={submit}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: 'rgb(var(--brand-600))', color: '#fff' }}>
            Add
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && title && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="px-4 py-3 flex items-center gap-3 flex-wrap">

              {/* Priority */}
              <div className="flex items-center gap-1">
                {(['high','medium','low'] as Task['priority'][]).map((p) => (
                  <button key={p} onClick={() => setPriority(p)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: priority === p ? `${PRIORITY_COLOR[p]}20` : 'rgba(255,255,255,0.04)',
                      color:      priority === p ? PRIORITY_COLOR[p] : 'rgba(255,255,255,0.3)',
                      border:    `1px solid ${priority === p ? PRIORITY_COLOR[p] + '40' : 'transparent'}`,
                    }}>
                    <Flag className="w-2.5 h-2.5" /> {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>

              {/* Recurrence */}
              <div className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-white/20" />
                {(['daily','weekly','monthly'] as Recurrence[]).map((r) => (
                  <button key={r} onClick={() => setRecurrence(recurrence === r ? null : r)}
                    className="text-xs px-2 py-0.5 rounded-md transition-all"
                    style={{
                      background: recurrence === r ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                      color: recurrence === r ? '#a78bfa' : 'rgba(255,255,255,0.25)',
                      border: `1px solid ${recurrence === r ? 'rgba(139,92,246,0.4)' : 'transparent'}`,
                    }}>
                    {RECURRENCE_LABELS[r]}
                  </button>
                ))}
              </div>

              {/* Tags */}
              <div className="flex items-center gap-1 flex-wrap">
                {ALL_TAGS.map((t) => {
                  const c = TAG_COLORS[t];
                  const on = tags.includes(t);
                  return (
                    <button key={t} onClick={() => toggleTag(t)}
                      className="text-xs px-2 py-0.5 rounded-full transition-all capitalize"
                      style={{
                        background: on ? c.bg : 'rgba(255,255,255,0.04)',
                        color: on ? c.text : 'rgba(255,255,255,0.25)',
                        border: `1px solid ${on ? c.text + '40' : 'transparent'}`,
                      }}>
                      {t}
                    </button>
                  );
                })}
              </div>

              {/* Date + time picker */}
              <div className="flex items-center gap-1.5 ml-auto">
                <Clock className="w-3.5 h-3.5 text-white/25" />
                <input
                  type="datetime-local"
                  value={dueLocal}
                  min={minDatetimeLocal()}
                  onChange={(e) => setDueLocal(e.target.value)}
                  className="bg-transparent text-white/50 text-xs outline-none cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Task Row ───────────────────────────────────────────────
const TaskRow = ({ task, onToggle, onDelete, onUpdateDatetime, onUpdateSubtasks }: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onUpdateDatetime: (dt: string | null) => void;
  onUpdateSubtasks: (subs: Subtask[]) => void;
}) => {
  const [showPicker,    setShowPicker]    = useState(false);
  const [showSubtasks,  setShowSubtasks]  = useState(false);
  const [newSubtask,    setNewSubtask]    = useState('');
  const status = dueDateStatus(task.due_datetime);
  const style  = status ? STATUS_STYLE[status] : null;
  const subs   = task.subtasks ?? [];
  const doneSubs = subs.filter((s) => s.completed).length;

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    const updated = [...subs, { id: Date.now().toString(), title: newSubtask.trim(), completed: false }];
    onUpdateSubtasks(updated);
    setNewSubtask('');
  };

  const toggleSubtask = (id: string) => {
    onUpdateSubtasks(subs.map((s) => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const deleteSubtask = (id: string) => {
    onUpdateSubtasks(subs.filter((s) => s.id !== id));
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
      className="group rounded-2xl transition-all overflow-hidden"
      style={{
        background: task.completed ? 'transparent' : 'rgba(255,255,255,0.03)',
        border:    `1px solid ${task.completed ? 'transparent' : 'rgba(255,255,255,0.06)'}`,
      }}>

      <div className="flex items-start gap-3 px-4 py-3">
        {/* Checkbox */}
        <button onClick={onToggle} className="mt-0.5 shrink-0 transition-transform hover:scale-110">
          {task.completed
            ? <CheckCircle2 className="w-5 h-5 text-green-400" fill="rgba(34,197,94,0.2)" />
            : <Circle className="w-5 h-5 text-white/20 hover:text-white/50 transition-colors" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${task.completed ? 'line-through text-white/25' : 'text-white'}`}>
            {task.title}
          </p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Priority */}
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLOR[task.priority] }} />
              <span className="text-xs text-white/25">{PRIORITY_LABEL[task.priority]}</span>
            </div>

            {/* Tag chips */}
            {(task.tags ?? []).map((t) => {
              const c = TAG_COLORS[t] ?? { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.4)' };
              return (
                <span key={t}
                  className="px-1.5 py-0.5 rounded-full text-xs capitalize"
                  style={{ background: c.bg, color: c.text }}>
                  {t}
                </span>
              );
            })}

            {/* Recurrence badge */}
            {task.recurrence && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs"
                style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>
                <RefreshCw className="w-2.5 h-2.5" />
                {RECURRENCE_LABELS[task.recurrence]}
              </div>
            )}

            {/* Subtask pill */}
            {subs.length > 0 && (
              <button onClick={() => setShowSubtasks((v) => !v)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', color: doneSubs === subs.length ? '#4ade80' : 'rgba(255,255,255,0.35)' }}>
                <ListChecks className="w-2.5 h-2.5" />
                {doneSubs}/{subs.length}
              </button>
            )}

            {/* Due datetime badge */}
            {task.due_datetime && style && (
              <button onClick={() => !task.completed && setShowPicker((v) => !v)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all"
                style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.text }}>
                <Clock className="w-2.5 h-2.5" />
                {dueDateLabel(task.due_datetime)}
              </button>
            )}

            {!task.due_datetime && !task.completed && (
              <button onClick={() => setShowPicker((v) => !v)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white/15 hover:text-white/40 transition-colors">
                <Clock className="w-2.5 h-2.5" /> Set date & time
              </button>
            )}

            {/* Inline datetime picker */}
            <AnimatePresence>
              {showPicker && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2 flex-wrap">
                  <input
                    type="datetime-local"
                    defaultValue={task.due_datetime ? toLocalInput(task.due_datetime) : ''}
                    min={minDatetimeLocal()}
                    onChange={(e) => {
                      if (e.target.value) { onUpdateDatetime(toISO(e.target.value)); setShowPicker(false); }
                    }}
                    className="bg-white/10 text-white text-xs rounded-lg px-2 py-1 outline-none border border-white/15"
                    style={{ colorScheme: 'dark' }}
                  />
                  {task.due_datetime && (
                    <button onClick={() => { onUpdateDatetime(null); setShowPicker(false); }}
                      className="text-white/25 hover:text-red-400 text-xs transition-colors">
                      clear
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Subtask progress bar */}
          {subs.length > 0 && (
            <div className="mt-2 h-0.5 rounded-full overflow-hidden w-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div className="h-full rounded-full bg-green-400"
                animate={{ width: `${(doneSubs / subs.length) * 100}%` }}
                transition={{ duration: 0.3 }} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setShowSubtasks((v) => !v)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/5 transition-colors"
            title="Add subtasks">
            <ListChecks className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subtasks panel */}
      <AnimatePresence>
        {showSubtasks && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="px-4 py-3 space-y-1.5">
              {subs.map((s) => (
                <div key={s.id} className="flex items-center gap-2 group/sub">
                  <button onClick={() => toggleSubtask(s.id)} className="shrink-0">
                    {s.completed
                      ? <CheckCircle2 className="w-4 h-4 text-green-400" fill="rgba(34,197,94,0.15)" />
                      : <Circle className="w-4 h-4 text-white/15 hover:text-white/40 transition-colors" />}
                  </button>
                  <span className={`text-xs flex-1 ${s.completed ? 'line-through text-white/20' : 'text-white/60'}`}>
                    {s.title}
                  </span>
                  <button onClick={() => deleteSubtask(s.id)}
                    className="opacity-0 group-hover/sub:opacity-100 transition-opacity text-white/15 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Add subtask input */}
              <div className="flex items-center gap-2 pt-1">
                <Plus className="w-3.5 h-3.5 text-white/20 shrink-0" />
                <input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                  placeholder="Add a step..."
                  className="flex-1 bg-transparent text-white/50 text-xs outline-none placeholder:text-white/15"
                />
                {newSubtask && (
                  <button onClick={addSubtask}
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors">
                    Add
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Main TaskList ──────────────────────────────────────────
export const TaskList = () => {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    tasksApi.getAll().then((r) => { setTasks(r.data.tasks); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const addTask = async (data: Omit<Task, 'id' | 'completed' | 'created_at'>) => {
    try {
      const r = await tasksApi.create({
        title: data.title, priority: data.priority,
        due_datetime: data.due_datetime ?? undefined,
        recurrence: data.recurrence ?? undefined,
        tags: data.tags?.length ? data.tags : undefined,
      });
      setTasks((prev) => [r.data.task, ...prev]);
    } catch { /**/ }
  };

  const advanceDueDate = (due: string, recurrence: Recurrence): string => {
    const d = new Date(due);
    if (recurrence === 'daily')   d.setDate(d.getDate() + 1);
    if (recurrence === 'weekly')  d.setDate(d.getDate() + 7);
    if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
    return d.toISOString();
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    if (!task.completed && task.recurrence && task.due_datetime) {
      const nextDue = advanceDueDate(task.due_datetime, task.recurrence);
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, due_datetime: nextDue } : t));
      try { await tasksApi.update(id, { due_datetime: nextDue }); } catch { /**/ }
      return;
    }

    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
    try { await tasksApi.update(id, { completed: !task.completed }); } catch { /**/ }
  };

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try { await tasksApi.remove(id); } catch { /**/ }
  };

  const updateDatetime = async (id: string, due_datetime: string | null) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, due_datetime } : t));
    try { await tasksApi.update(id, { due_datetime: due_datetime ?? '__clear__' }); } catch { /**/ }
  };

  const updateSubtasks = async (id: string, subtasks: Subtask[]) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, subtasks } : t));
    try { await tasksApi.update(id, { subtasks }); } catch { /**/ }
  };

  const pending   = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) =>  t.completed);
  const overdue   = pending.filter((t) => dueDateStatus(t.due_datetime) === 'overdue').length;
  const todayCount = pending.filter((t) => dueDateStatus(t.due_datetime) === 'today').length;
  const soonCount  = pending.filter((t) => dueDateStatus(t.due_datetime) === 'soon').length;

  return (
    <div className="card-dark p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold text-sm">Tasks</p>
            {overdue > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-xs font-bold"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                {overdue} overdue
              </span>
            )}
          </div>
          <p className="text-white/25 text-xs mt-0.5">{pending.length} remaining</p>
        </div>
        <div className="flex gap-1.5">
          {todayCount > 0 && (
            <span className="text-xs px-2 py-1 rounded-lg"
              style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.2)' }}>
              {todayCount} today
            </span>
          )}
          {soonCount > 0 && (
            <span className="text-xs px-2 py-1 rounded-lg"
              style={{ background: 'rgba(234,179,8,0.1)', color: '#facc15', border: '1px solid rgba(234,179,8,0.2)' }}>
              {soonCount} soon
            </span>
          )}
        </div>
      </div>

      {/* Add task */}
      <AddTaskForm onAdd={addTask} />

      {/* Pending */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {pending.length === 0 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center text-white/20 text-sm py-6">
                No tasks yet — add one above ↑
              </motion.p>
            )}
            {pending.map((task) => (
              <TaskRow key={task.id} task={task}
                onToggle={() => toggleTask(task.id)}
                onDelete={() => deleteTask(task.id)}
                onUpdateDatetime={(dt) => updateDatetime(task.id, dt)}
                onUpdateSubtasks={(subs) => updateSubtasks(task.id, subs)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Completed (collapsible) */}
      {completed.length > 0 && (
        <div>
          <button onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-2 text-white/25 hover:text-white/50 text-xs font-medium transition-colors w-full py-1">
            {showDone ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {completed.length} completed
          </button>
          <AnimatePresence>
            {showDone && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-1.5 mt-2">
                {completed.map((task) => (
                  <TaskRow key={task.id} task={task}
                    onToggle={() => toggleTask(task.id)}
                    onDelete={() => deleteTask(task.id)}
                    onUpdateDatetime={(dt) => updateDatetime(task.id, dt)}
                    onUpdateSubtasks={(subs) => updateSubtasks(task.id, subs)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
