import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, Plus, X, Clock, Check } from 'lucide-react';

interface Reminder {
  id: string;
  title: string;
  datetime: string; // ISO string
  fired: boolean;
  dismissed: boolean;
}

const STORAGE_KEY = 'ff_reminders';

const loadReminders = (): Reminder[] => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch { /**/ }
  return [];
};

const minDatetimeLocal = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
};

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatReminderTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMs < 0) {
    const ago = Math.abs(diffMin);
    if (ago < 60) return `${ago}m ago`;
    return `${Math.floor(ago / 60)}h ago`;
  }
  if (diffMin < 60) return `in ${diffMin}m`;
  if (diffMin < 1440) {
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const isOverdue = (iso: string) => new Date(iso).getTime() < Date.now();

export const ReminderList = () => {
  const [reminders, setReminders] = useState<Reminder[]>(loadReminders);
  const [showAdd, setShowAdd]     = useState(false);
  const [title, setTitle]         = useState('');
  const [datetime, setDatetime]   = useState('');
  const [ringing, setRinging]     = useState<string[]>([]);
  const [permDenied, setPermDenied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  }, [reminders]);

  // Request notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((p) => {
        if (p === 'denied') setPermDenied(true);
      });
    } else if (Notification.permission === 'denied') {
      setPermDenied(true);
    }
  }, []);

  // Check reminders every 30s
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      setReminders((prev) => {
        const updated = prev.map((r) => {
          if (r.fired || r.dismissed) return r;
          const t = new Date(r.datetime).getTime();
          if (t <= now) {
            // Fire notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('⏰ Kingsmode Reminder', {
                body: r.title,
                icon: '/favicon.ico',
                tag: r.id,
              });
            }
            setRinging((prev) => [...prev, r.id]);
            return { ...r, fired: true };
          }
          return r;
        });
        return updated;
      });
    };

    check(); // run immediately
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  const addReminder = () => {
    if (!title.trim() || !datetime) return;
    const newR: Reminder = {
      id: Date.now().toString(),
      title: title.trim(),
      datetime: new Date(datetime).toISOString(),
      fired: false,
      dismissed: false,
    };
    setReminders((prev) => [...prev, newR].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()));
    setTitle('');
    setDatetime('');
    setShowAdd(false);
  };

  const dismiss = (id: string) => {
    setReminders((prev) => prev.map((r) => r.id === id ? { ...r, dismissed: true } : r));
    setRinging((prev) => prev.filter((rid) => rid !== id));
  };

  const remove = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    setRinging((prev) => prev.filter((rid) => rid !== id));
  };

  const active = reminders.filter((r) => !r.dismissed);
  const upcoming = active.filter((r) => !r.fired);
  const fired = active.filter((r) => r.fired);

  return (
    <div className="card-dark p-6">
      <audio ref={audioRef} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-4 h-4 text-white/50" />
            {fired.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-400" />
            )}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Reminders</p>
            <p className="text-white/25 text-xs mt-0.5">
              {upcoming.length > 0 ? `${upcoming.length} upcoming` : 'No upcoming reminders'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: showAdd ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {showAdd ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showAdd ? 'Cancel' : 'Add reminder'}
        </button>
      </div>

      {/* Permission warning */}
      {permDenied && (
        <div className="mb-4 px-3 py-2.5 rounded-xl text-xs text-orange-300 flex items-center gap-2"
          style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.15)' }}>
          <Bell className="w-3.5 h-3.5 shrink-0" />
          Notifications are blocked. Enable them in browser settings to receive alerts.
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4"
          >
            <div className="flex flex-col gap-2 pb-1">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addReminder()}
                placeholder="Reminder message..."
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/25 placeholder:text-white/20 transition-colors"
              />
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={datetime}
                  onChange={(e) => setDatetime(e.target.value)}
                  min={minDatetimeLocal()}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/25 transition-colors"
                  style={{ colorScheme: 'dark' }}
                />
                <button
                  onClick={addReminder}
                  disabled={!title.trim() || !datetime}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-30"
                  style={{ background: 'rgb(var(--brand-600))' }}
                >
                  Set
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fired / ringing alerts */}
      <AnimatePresence>
        {fired.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 mb-2 px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)' }}
          >
            <BellRing className="w-4 h-4 text-orange-400 shrink-0 animate-bounce" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{r.title}</p>
              <p className="text-orange-400/70 text-xs">{formatReminderTime(r.datetime)}</p>
            </div>
            <button
              onClick={() => dismiss(r.id)}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-orange-300 transition-all hover:bg-orange-400/10"
            >
              <Check className="w-3 h-3" />
              Done
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Upcoming reminders */}
      <div className="space-y-2">
        <AnimatePresence>
          {upcoming.map((r) => (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl group"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Clock className="w-4 h-4 text-white/25 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{r.title}</p>
                <p className={`text-xs mt-0.5 ${isOverdue(r.datetime) ? 'text-red-400' : 'text-white/30'}`}>
                  {formatReminderTime(r.datetime)} &middot; {new Date(r.datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {new Date(r.datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => remove(r.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {upcoming.length === 0 && fired.length === 0 && (
          <div className="text-center py-6 text-white/15 text-sm">
            No reminders set. Add one above ↑
          </div>
        )}
      </div>
    </div>
  );
};
