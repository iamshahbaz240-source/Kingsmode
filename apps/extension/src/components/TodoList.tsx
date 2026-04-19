import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Check, X, Zap } from 'lucide-react';
import { useTasks, Task } from '../store/todoStore';

const PRIORITY_STYLES: Record<Task['priority'], { dot: string; label: string }> = {
  low:    { dot: '#22c55e', label: 'Low' },
  medium: { dot: '#f59e0b', label: 'Med' },
  high:   { dot: '#ef4444', label: 'High' },
};

const formatDeadline = (deadline?: string) => {
  if (!deadline) return null;
  const d     = new Date(deadline);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff  = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: 'Overdue', color: '#f87171' };
  if (diff === 0) return { label: 'Today',    color: '#fb923c' };
  if (diff === 1) return { label: 'Tomorrow', color: '#fbbf24' };
  return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'rgba(255,255,255,0.4)' };
};

export const TodoList = () => {
  const { tasks, synced, syncing, addTask, toggleTask, deleteTask, clearCompleted } = useTasks();
  const [input,    setInput]    = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [showForm, setShowForm] = useState(false);

  const handleAdd = () => {
    if (!input.trim()) return;
    addTask(input.trim(), priority, deadline || undefined);
    setInput(''); setDeadline(''); setPriority('medium'); setShowForm(false);
  };

  const active = tasks.filter((t) => !t.completed);
  const done   = tasks.filter((t) => t.completed);

  return (
    <div className="flex flex-col gap-3">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {active.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-black"
              style={{ background: 'rgba(200,255,0,0.12)', color: 'var(--accent)', border: '1px solid rgba(200,255,0,0.2)' }}>
              {active.length}
            </span>
          )}
          {syncing && <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />}
          {synced && !syncing && <Zap className="w-3 h-3" style={{ color: 'var(--accent)' }} fill="currentColor" />}
        </div>
        <div className="flex items-center gap-2">
          {done.length > 0 && (
            <button onClick={clearCompleted}
              className="text-xs font-semibold transition-colors"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
              Clear done
            </button>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowForm((v) => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-black text-sm btn-shimmer"
            style={{ background: 'var(--accent)' }}
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </motion.button>
        </div>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2.5 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="What needs to be done?"
                className="bg-transparent text-white text-sm placeholder:text-white/25 outline-none font-medium"
              />
              <div className="flex items-center gap-2">
                {/* Priority pills */}
                <div className="flex gap-1">
                  {(['low','medium','high'] as Task['priority'][]).map((p) => (
                    <button key={p} onClick={() => setPriority(p)}
                      className="text-xs px-2 py-0.5 rounded-md font-bold transition-all"
                      style={priority === p
                        ? { background: PRIORITY_STYLES[p].dot + '25', color: PRIORITY_STYLES[p].dot, border: `1px solid ${PRIORITY_STYLES[p].dot}50` }
                        : { background: 'transparent', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.1)' }
                      }>
                      {PRIORITY_STYLES[p].label}
                    </button>
                  ))}
                </div>
                {/* Date */}
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                  className="ml-auto text-xs rounded-md px-2 py-0.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAdd}
                className="w-full py-1.5 rounded-lg text-xs font-black text-black btn-shimmer"
                style={{ background: 'var(--accent)' }}
              >
                Add Task
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task list */}
      <div className="flex flex-col gap-1.5">
        <AnimatePresence>
          {tasks.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-2xl">✦</p>
              <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>No tasks yet</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Add one above to get started</p>
            </motion.div>
          )}

          {[...active, ...done].map((task) => {
            const dl = formatDeadline(task.deadline);
            const ps = PRIORITY_STYLES[task.priority];
            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: task.completed ? 0.45 : 1, x: 0 }}
                exit={{ opacity: 0, x: 12, height: 0 }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl group transition-all cursor-default"
                style={{ background: 'transparent' }}
                onMouseEnter={e => !task.completed && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTask(task.id)}
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all"
                  style={task.completed
                    ? { background: 'var(--accent)', border: '2px solid transparent' }
                    : { background: 'transparent', border: `2px solid rgba(255,255,255,0.2)` }
                  }
                  onMouseEnter={e => !task.completed && (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => !task.completed && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                >
                  {task.completed && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                </button>

                {/* Priority dot */}
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ps.dot, opacity: task.completed ? 0.4 : 1 }} />

                {/* Title */}
                <span className={`flex-1 text-xs leading-snug font-medium ${task.completed ? 'line-through' : ''}`}
                  style={{ color: task.completed ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.88)' }}>
                  {task.title}
                </span>

                {/* Deadline */}
                {dl && !task.completed && (
                  <span className="text-xs font-bold shrink-0" style={{ color: dl.color }}>{dl.label}</span>
                )}

                {/* Delete */}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
