import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Flame, Star, Target, LogOut, CheckCircle2, Circle, Plus, X, BarChart2, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { PomodoroTimer } from '../components/PomodoroTimer';
import { TaskList } from '../components/TaskList';
import { ReminderList } from '../components/ReminderList';
import { MusicPlayer } from '../components/MusicPlayer';
import { OnboardingModal, useOnboarding } from '../components/OnboardingModal';
import { sessionsApi } from '../services/api';
import { quotes } from '../data/quotes';

// ── Constants ─────────────────────────────────────────────
const getDailyQuote = () => quotes[new Date().getDate() % quotes.length];
const getLevelName  = (l: number) => ['Beginner','Focused','Disciplined','Expert','Master','Legend'][Math.min(l-1,5)];
const getXPForNext  = (l: number) => l * 100;
const WEEK_DAYS     = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const FOCUS_GOAL_KEY = 'ff_focus_goal';
const loadFocusGoal = () => parseInt(localStorage.getItem(FOCUS_GOAL_KEY) || '120');

const DEFAULT_HABITS = [
  { id: 'reading',    name: 'Reading',    emoji: '📚', color: '#3b82f6' },
  { id: 'exercise',   name: 'Exercise',   emoji: '🏃', color: '#22c55e' },
  { id: 'meditation', name: 'Meditation', emoji: '🧘', color: '#a855f7' },
  { id: 'deepwork',   name: 'Deep Work',  emoji: '💻', color: '#f59e0b' },
  { id: 'journal',    name: 'Journal',    emoji: '✍️',  color: '#ec4899' },
];

const todayKey = () => new Date().toDateString();

const loadHabits = () => {
  try { const s = localStorage.getItem('ff_habits'); if (s) return JSON.parse(s); } catch { /**/ }
  return DEFAULT_HABITS;
};
const loadDoneHabits = (): Record<string, boolean> => {
  try { const s = localStorage.getItem(`ff_done_${todayKey()}`); if (s) return JSON.parse(s); } catch { /**/ }
  return {};
};

// ── Focus Ring SVG ─────────────────────────────────────────
const FocusRing = ({ minutes, goal }: { minutes: number; goal: number }) => {
  const pct    = Math.min(minutes / goal, 1);
  const r      = 72;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const hrs    = Math.floor(minutes / 60);
  const mins   = minutes % 60;

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className="relative w-[160px] h-[160px] sm:w-[180px] sm:h-[180px]">
        <svg width="100%" height="100%" viewBox="0 0 180 180" className="-rotate-90">
          <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <motion.circle
            cx="90" cy="90" r={r} fill="none"
            stroke="url(#ringGrad)" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
          />
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgb(var(--brand-600))" />
              <stop offset="100%" stopColor="rgb(var(--brand-400))" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {minutes === 0 ? (
            <>
              <span className="text-white/20 text-2xl font-bold">0m</span>
              <span className="text-white/20 text-xs mt-0.5">today</span>
            </>
          ) : (
            <>
              <span className="text-white text-2xl font-bold tabular-nums">
                {hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`}
              </span>
              <span className="text-white/30 text-xs mt-0.5">focused today</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {[0.25, 0.5, 0.75, 1].map((mark) => (
          <div key={mark} className={`h-1 w-1 rounded-full transition-all ${pct >= mark ? 'bg-brand-400' : 'bg-white/10'}`} />
        ))}
        <span className="text-white/20 text-xs ml-1">Goal: {goal}m</span>
      </div>
    </div>
  );
};

// ── Weekly Chart ───────────────────────────────────────────
const WeeklyChart = ({ bars, maxMinutes }: { bars: { day: string; minutes: number }[]; maxMinutes: number }) => (
  <div className="flex items-end gap-2 w-full" style={{ height: 96 }}>
    {bars.map((bar, i) => {
      const isToday  = i === bars.length - 1;
      const heightPct = bar.minutes > 0 ? Math.max((bar.minutes / maxMinutes) * 100, 8) : 4;
      return (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5" style={{ height: '100%' }}>
          <div className="flex-1 w-full flex items-end">
            <motion.div
              className="w-full rounded-md"
              style={{ background: isToday ? 'rgb(var(--brand-500))' : 'rgba(255,255,255,0.08)' }}
              initial={{ height: 0 }}
              animate={{ height: `${heightPct}%` }}
              transition={{ delay: 0.5 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <span className={`text-xs leading-none ${isToday ? 'text-brand-400 font-semibold' : 'text-white/20'}`}>
            {bar.day.slice(0, 1)}
          </span>
        </div>
      );
    })}
  </div>
);

// ── Habit Row ──────────────────────────────────────────────
const HabitRow = ({ habit, done, onToggle }: { habit: typeof DEFAULT_HABITS[0]; done: boolean; onToggle: () => void }) => (
  <motion.div
    layout
    className="flex items-center gap-4 px-4 py-3 rounded-2xl transition-all"
    style={{ background: done ? `${habit.color}12` : 'rgba(255,255,255,0.03)', border: `1px solid ${done ? habit.color + '30' : 'rgba(255,255,255,0.05)'}` }}
  >
    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
      style={{ background: `${habit.color}20` }}>
      {habit.emoji}
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-semibold ${done ? 'text-white/50 line-through' : 'text-white'}`}>{habit.name}</p>
      <p className="text-white/25 text-xs">Daily habit</p>
    </div>
    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
      <motion.div className="h-full rounded-full" style={{ background: habit.color }}
        animate={{ width: done ? '100%' : '0%' }} transition={{ duration: 0.4 }} />
    </div>
    <button onClick={onToggle} className="shrink-0 transition-transform hover:scale-110">
      {done
        ? <CheckCircle2 className="w-6 h-6" style={{ color: habit.color }} fill={`${habit.color}40`} />
        : <Circle className="w-6 h-6 text-white/15 hover:text-white/40 transition-colors" />
      }
    </button>
  </motion.div>
);

// ── Stat Card ──────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, delay }: { icon: React.ReactNode; label: string; value: number | string; color: string; delay: number }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="relative overflow-hidden rounded-[20px] p-4 flex flex-col gap-3 group"
    style={{ background: 'rgb(11,11,15)', border: '1px solid rgba(255,255,255,0.055)' }}>
    {/* Subtle top accent on hover */}
    <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ background: `linear-gradient(90deg, transparent, ${color}50, transparent)` }} />
    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
      <div style={{ color }}>{icon}</div>
    </div>
    <div>
      <p className="font-black text-white tabular-nums" style={{ fontSize: '1.6rem', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
      <p className="text-white/30 text-xs mt-1.5">{label}</p>
    </div>
  </motion.div>
);

// ── Main Dashboard ─────────────────────────────────────────
interface TodayStats {
  sessions: number;
  totalMinutes: number;
  weeklyData: { date: string; sessions_completed: number; focus_minutes: number }[];
}

export const DashboardPage = () => {
  const { user, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const quote = getDailyQuote();
  const showOnboarding = useOnboarding();
  const [onboardingDone, setOnboardingDone] = useState(!showOnboarding);

  const focusGoal = loadFocusGoal();
  const [todayStats, setTodayStats] = useState<TodayStats>({ sessions: 0, totalMinutes: 0, weeklyData: [] });
  const [habits, setHabits]         = useState(loadHabits);
  const [doneHabits, setDoneHabits] = useState<Record<string, boolean>>(loadDoneHabits);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');

  const xp       = user?.xp ?? 0;
  const level    = user?.level ?? 1;
  const xpForNext = getXPForNext(level);
  const xpPct    = ((xp % xpForNext) / xpForNext) * 100;
  const doneCount = Object.values(doneHabits).filter(Boolean).length;
  const habitPct  = habits.length > 0 ? Math.round((doneCount / habits.length) * 100) : 0;

  useEffect(() => {
    sessionsApi.today().then((r) => setTodayStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem('ff_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem(`ff_done_${todayKey()}`, JSON.stringify(doneHabits));
  }, [doneHabits]);

  const toggleHabit = (id: string) =>
    setDoneHabits((prev) => ({ ...prev, [id]: !prev[id] }));

  const addHabit = () => {
    if (!newHabitName.trim()) return;
    const colors = ['#3b82f6','#22c55e','#a855f7','#f59e0b','#ec4899','#14b8a6','#f97316'];
    const emojis = ['⭐','🎯','💪','📖','🎨','🎵','🌱'];
    const idx    = habits.length % colors.length;
    setHabits((prev: typeof DEFAULT_HABITS) => [...prev, {
      id: Date.now().toString(), name: newHabitName.trim(),
      emoji: emojis[idx], color: colors[idx],
    }]);
    setNewHabitName('');
    setShowAddHabit(false);
  };

  const removeHabit = (id: string) => {
    setHabits((prev: typeof DEFAULT_HABITS) => prev.filter((h: typeof DEFAULT_HABITS[0]) => h.id !== id));
    setDoneHabits((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const handleSessionComplete = async (durationSeconds: number, notes?: string) => {
    try {
      const r1 = await sessionsApi.start('pomodoro', durationSeconds);
      const r2 = await sessionsApi.complete(r1.data.session.id, notes);
      const { xpEarned, leveledUp, user: u } = r2.data;
      updateUser(u);
      setTodayStats((prev) => ({ ...prev, sessions: prev.sessions + 1, totalMinutes: prev.totalMinutes + Math.floor(durationSeconds / 60) }));
      return { xpEarned, leveledUp };
    } catch {
      return { xpEarned: 0, leveledUp: false };
    }
  };

  // Build 7-day chart
  const today = new Date();
  const weekBars = Array.from({ length: 7 }).map((_, i) => {
    const d   = new Date(today); d.setDate(today.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    const found = todayStats.weeklyData.find((w) => w.date.startsWith(key));
    return { day: WEEK_DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1], minutes: found?.focus_minutes ?? 0 };
  });
  const maxMinutes = Math.max(...weekBars.map((b) => b.minutes), 1);

  const greeting = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';

  return (
    <div className="min-h-screen bg-dark-900 relative">
      {!onboardingDone && <OnboardingModal onDone={() => setOnboardingDone(true)} />}

      {/* Subtle background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.07) 0%, transparent 70%)' }} />

      {/* ── Top nav ── */}
      <div className="sticky top-0 z-20 px-4 sm:px-6 py-3 sm:py-4"
        style={{ background: 'rgba(6,6,8,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Lime top stripe */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, var(--accent), transparent 40%)' }} />
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-dark-900 text-xs"
              style={{ background: 'var(--accent)' }}>
              K
            </div>
            <span className="text-white font-black tracking-tight">Kingsmode</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/analytics')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }} title="Analytics">
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => navigate('/settings')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }} title="Settings">
              <Settings className="w-3.5 h-3.5" />
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Star className="w-3 h-3 text-brand-400" fill="currentColor" />
              <span className="text-white/60 text-xs font-medium">Lv{level} {getLevelName(level)}</span>
            </div>
            {(user?.streak ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.15)' }}>
                <Flame className="w-3 h-3 text-orange-400" fill="currentColor" />
                <span className="text-orange-400 text-xs font-semibold">{user?.streak}d</span>
              </div>
            )}
            <ThemeToggle />
            <button onClick={logout} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-5">

        {/* ── Greeting ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="label mb-1">Good {greeting}</p>
          <h1 className="text-white font-black tracking-tight" style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', letterSpacing: '-0.03em' }}>
            {user?.name} 👋
          </h1>
          <p className="text-white/25 text-sm mt-2 italic leading-relaxed">"{quote.text}"</p>
        </motion.div>

        {/* ── Hero row: Focus ring + XP card ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Focus ring */}
          <div className="card-dark p-6 flex flex-col items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />
            <div className="w-full flex items-center justify-between relative z-10">
              <p className="text-white/40 text-xs font-semibold uppercase tracking-widest">Today's Focus</p>
              <span className="text-brand-400 text-xs font-bold">{todayStats.sessions} sessions</span>
            </div>
            <FocusRing minutes={todayStats.totalMinutes} goal={focusGoal} />
          </div>

          {/* XP + level + habit completion */}
          <div className="flex flex-col gap-3">
            {/* XP bar */}
            <div className="card-dark p-5 flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-bold text-lg">Level {level}</p>
                  <p className="text-white/30 text-xs mt-0.5">{getLevelName(level)}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-lg tabular-nums">{xp % xpForNext}<span className="text-white/20 text-sm font-normal"> / {xpForNext}</span></p>
                  <p className="text-white/30 text-xs mt-0.5">XP this level</p>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
                  initial={{ width: 0 }} animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }} />
              </div>
              <p className="text-white/20 text-xs mt-2">{xpForNext - (xp % xpForNext)} XP to next level</p>
            </div>

            {/* Habits done today */}
            <div className="card-dark p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-widest">Habits Today</p>
                <span className="font-bold text-sm" style={{ color: habitPct === 100 ? '#22c55e' : 'rgb(var(--brand-400))' }}>
                  {habitPct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: habitPct === 100 ? '#22c55e' : 'rgb(var(--brand-500))' }}
                  initial={{ width: 0 }} animate={{ width: `${habitPct}%` }}
                  transition={{ duration: 1, delay: 0.5 }} />
              </div>
              <p className="text-white/20 text-xs mt-2">{doneCount} of {habits.length} completed</p>
            </div>
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Zap className="w-4 h-4" fill="currentColor" />}   label="Total XP"   value={xp}                  color="#eab308" delay={0.10} />
          <StatCard icon={<Star className="w-4 h-4" fill="currentColor" />}  label="Level"      value={level}               color="rgb(var(--brand-400))" delay={0.13} />
          <StatCard icon={<Flame className="w-4 h-4" fill="currentColor" />} label="Day Streak" value={user?.streak ?? 0}   color="#f97316" delay={0.16} />
          <StatCard icon={<Target className="w-4 h-4" />}                    label="Sessions"   value={todayStats.sessions} color="#22c55e" delay={0.19} />
        </div>

        {/* ── Timer + Chart ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-4">

          {/* Pomodoro */}
          <div className="card-dark p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)' }} />
            <p className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-5">Focus Timer</p>
            <PomodoroTimer onSessionComplete={handleSessionComplete} />
          </div>

          {/* Weekly chart */}
          <div className="card-dark p-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white font-semibold text-sm">Weekly Focus</p>
              <span className="text-white/30 text-xs">
                {todayStats.totalMinutes > 0
                  ? `${Math.floor(todayStats.totalMinutes / 60)}h ${todayStats.totalMinutes % 60}m today`
                  : 'No sessions yet'}
              </span>
            </div>
            <p className="text-white/20 text-xs mb-6">Minutes focused per day</p>
            <WeeklyChart bars={weekBars} maxMinutes={maxMinutes} />

            {/* Weekly goal progress */}
            {(() => {
              const weekTotal = weekBars.reduce((a, b) => a + b.minutes, 0);
              const weekGoal  = focusGoal * 7;
              const weekPct   = Math.min(weekTotal / weekGoal, 1);
              return (
                <div className="mt-5 pt-4 border-t border-white/[0.05]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/30 text-xs">Weekly goal</span>
                    <span className="text-white/50 text-xs font-medium">{weekTotal}m / {weekGoal}m</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div className="h-full rounded-full"
                      style={{ background: weekPct >= 1 ? '#22c55e' : 'linear-gradient(90deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
                      initial={{ width: 0 }} animate={{ width: `${weekPct * 100}%` }}
                      transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {[
                      { label: 'This week', value: `${weekTotal}m` },
                      { label: 'Best day',  value: `${Math.max(...weekBars.map(b => b.minutes))}m` },
                      { label: 'Avg/day',   value: `${Math.round(weekTotal / 7)}m` },
                    ].map((s) => (
                      <div key={s.label} className="text-center">
                        <p className="text-white font-bold text-sm">{s.value}</p>
                        <p className="text-white/25 text-xs mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </motion.div>

        {/* ── Music / Ambient ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <MusicPlayer />
        </motion.div>

        {/* ── Habits ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="card-dark p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-white font-semibold text-sm">Daily Habits</p>
              <p className="text-white/25 text-xs mt-0.5">Build consistency, day by day</p>
            </div>
            <button onClick={() => setShowAddHabit((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: showAddHabit ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {showAddHabit ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {showAddHabit ? 'Cancel' : 'Add habit'}
            </button>
          </div>

          {/* Add habit input */}
          <AnimatePresence>
            {showAddHabit && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                <div className="flex gap-2 pb-1">
                  <input
                    autoFocus
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addHabit()}
                    placeholder="Habit name..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/25 placeholder:text-white/20 transition-colors"
                  />
                  <button onClick={addHabit}
                    className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
                    style={{ background: 'rgb(var(--brand-600))' }}>
                    Add
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <AnimatePresence>
              {habits.map((habit: typeof DEFAULT_HABITS[0]) => (
                <div key={habit.id} className="relative group">
                  <HabitRow habit={habit} done={!!doneHabits[habit.id]} onToggle={() => toggleHabit(habit.id)} />
                  <button onClick={() => removeHabit(habit.id)}
                    className="absolute right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </AnimatePresence>

            {habits.length === 0 && (
              <div className="text-center py-8 text-white/20 text-sm">
                No habits yet. Add one above ↑
              </div>
            )}
          </div>

          {doneCount === habits.length && habits.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-2xl text-center"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <p className="text-green-400 font-semibold text-sm">🏆 All habits done today! Keep it up.</p>
            </motion.div>
          )}
        </motion.div>

        {/* ── Tasks ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
          <TaskList />
        </motion.div>

        {/* ── Reminders ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
          <ReminderList />
        </motion.div>

        {/* ── Streak reminder ── */}
        {(user?.streak ?? 0) === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
            className="flex items-center gap-4 p-4 rounded-2xl"
            style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.15)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(251,146,60,0.1)' }}>
              <Flame className="w-5 h-5 text-orange-400" fill="currentColor" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Start your streak today!</p>
              <p className="text-white/30 text-xs mt-0.5">Complete a focus session to begin 🔥</p>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
};
