import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, Clock, Calendar, CheckSquare, Flame, TrendingUp, Star, Download, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sessionsApi } from '../services/api';

interface HeatmapDay { date: string; sessions_completed: number; focus_minutes: number }
interface MonthBar    { month: string; minutes: number; sessions: number }
interface Totals {
  sessions: number; hours: number; activeDays: number;
  tasksCompleted: number; streak: number; level: number;
}
interface SessionRecord {
  id: string; type: string; duration: number;
  started_at: string; ended_at: string; xp_earned: number; notes?: string;
}

// ── Heatmap ────────────────────────────────────────────────
const intensity = (min: number) => {
  if (min === 0)   return 0;
  if (min < 30)    return 1;
  if (min < 60)    return 2;
  if (min < 120)   return 3;
  return 4;
};

const HEAT_COLORS = [
  'rgba(255,255,255,0.04)',
  'rgba(124,58,237,0.25)',
  'rgba(124,58,237,0.45)',
  'rgba(124,58,237,0.70)',
  'rgb(124,58,237)',
];

const Heatmap = ({ data }: { data: HeatmapDay[] }) => {
  const byDate = Object.fromEntries(data.map((d) => [d.date.slice(0, 10), d]));
  const today  = new Date();

  // Build 13 weeks × 7 days, ending today
  const cells: { date: string; min: number; sessions: number }[] = [];
  for (let i = 90; i >= 0; i--) {
    const d   = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const rec = byDate[key];
    cells.push({ date: key, min: rec?.focus_minutes ?? 0, sessions: rec?.sessions_completed ?? 0 });
  }

  // Pad so first cell is Monday
  const firstDay = new Date(cells[0].date).getDay(); // 0=Sun
  const padStart  = firstDay === 0 ? 6 : firstDay - 1;
  const grid = [...Array(padStart).fill(null), ...cells];

  // Split into columns of 7
  const cols: (typeof cells[0] | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) cols.push(grid.slice(i, i + 7));

  const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1 pt-5">
          {DAYS.map((d, i) => (
            <div key={i} className="w-3 h-3 flex items-center justify-center text-white/20 text-[9px]">{d}</div>
          ))}
        </div>

        {cols.map((col, ci) => {
          const monthLabel = col.find((c) => c)?.date.slice(0, 10);
          const showMonth  = monthLabel && new Date(monthLabel).getDate() <= 7;
          const month      = showMonth ? new Date(monthLabel!).toLocaleDateString('en-US', { month: 'short' }) : '';
          return (
            <div key={ci} className="flex flex-col gap-1">
              <div className="h-4 flex items-center">
                <span className="text-white/20 text-[9px]">{month}</span>
              </div>
              {col.map((cell, ri) =>
                cell ? (
                  <div key={ri} title={`${cell.date}: ${cell.min}m focus, ${cell.sessions} sessions`}
                    className="w-3 h-3 rounded-sm transition-all hover:scale-125 cursor-default"
                    style={{ background: HEAT_COLORS[intensity(cell.min)] }} />
                ) : (
                  <div key={ri} className="w-3 h-3" />
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-white/20 text-xs">Less</span>
        {HEAT_COLORS.map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
        ))}
        <span className="text-white/20 text-xs">More</span>
      </div>
    </div>
  );
};

// ── Monthly bar chart ──────────────────────────────────────
const MonthlyChart = ({ bars }: { bars: MonthBar[] }) => {
  const max = Math.max(...bars.map((b) => Number(b.minutes)), 1);
  return (
    <div className="flex items-end gap-3 h-32 w-full">
      {bars.map((b, i) => {
        const pct = Math.max((Number(b.minutes) / max) * 100, 4);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex items-end" style={{ height: 96 }}>
              <motion.div
                className="w-full rounded-lg"
                style={{ background: 'linear-gradient(180deg, rgb(var(--brand-500)), rgb(var(--brand-700)))' }}
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ delay: 0.3 + i * 0.07, duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <span className="text-white/30 text-xs">{b.month}</span>
          </div>
        );
      })}
    </div>
  );
};

// ── Stat card ──────────────────────────────────────────────
const BigStat = ({ icon, label, value, sub, color, delay }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string; delay: number
}) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="relative overflow-hidden rounded-[20px] p-5 flex flex-col gap-3 group"
    style={{ background: 'rgb(11,11,15)', border: '1px solid rgba(255,255,255,0.055)' }}>
    <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ background: `linear-gradient(90deg, transparent, ${color}50, transparent)` }} />
    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
      <div style={{ color }}>{icon}</div>
    </div>
    <div>
      <p className="text-white font-black tabular-nums" style={{ fontSize: '2rem', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
      {sub && <p className="text-white/25 text-xs mt-0.5">{sub}</p>}
      <p className="label mt-2">{label}</p>
    </div>
  </motion.div>
);

// ── Main page ──────────────────────────────────────────────
export const AnalyticsPage = () => {
  const navigate = useNavigate();
  const [heatmap,  setHeatmap]  = useState<HeatmapDay[]>([]);
  const [totals,   setTotals]   = useState<Totals | null>(null);
  const [monthly,  setMonthly]  = useState<MonthBar[]>([]);
  const [history,  setHistory]  = useState<SessionRecord[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([sessionsApi.analytics(), sessionsApi.history()])
      .then(([ana, hist]) => {
        setHeatmap(ana.data.heatmap);
        setTotals(ana.data.totals);
        setMonthly(ana.data.monthly);
        setHistory(hist.data.sessions);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    const rows = [
      ['Date', 'Type', 'Duration (min)', 'XP Earned', 'Notes'],
      ...history.map((s) => [
        new Date(s.ended_at).toLocaleDateString(),
        s.type,
        Math.round(s.duration / 60).toString(),
        s.xp_earned.toString(),
        `"${(s.notes ?? '').replace(/"/g, '""')}"`,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'kingsmode-sessions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const totalMin = (monthly.reduce((a, b) => a + Number(b.minutes), 0));
  const bestMonth = monthly.reduce<MonthBar | null>((best, b) => (!best || Number(b.minutes) > Number(best.minutes)) ? b : best, null);

  // ── Focus insights ────────────────────────────────────────
  const insights: { emoji: string; text: string }[] = [];
  if (heatmap.length > 0 && history.length > 0) {
    // Best day of week
    const byDow = [0,0,0,0,0,0,0];
    heatmap.forEach((d) => { byDow[new Date(d.date).getDay()] += d.focus_minutes; });
    const bestDow = byDow.indexOf(Math.max(...byDow));
    const DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    if (byDow[bestDow] > 0) insights.push({ emoji: '📅', text: `You focus most on ${DOW[bestDow]}s` });

    // Best time of day
    const buckets = { morning: 0, afternoon: 0, evening: 0 };
    history.forEach((s) => {
      const h = new Date(s.started_at).getHours();
      if (h < 12) buckets.morning += s.duration;
      else if (h < 17) buckets.afternoon += s.duration;
      else buckets.evening += s.duration;
    });
    const bestTime = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0][0];
    insights.push({ emoji: '⏰', text: `Your peak focus time is the ${bestTime}` });

    // Avg session length
    const completed = history.filter((s) => s.type === 'pomodoro');
    if (completed.length > 0) {
      const avg = Math.round(completed.reduce((a, s) => a + s.duration, 0) / completed.length / 60);
      insights.push({ emoji: '⚡', text: `Average session length: ${avg} minutes` });
    }

    // Consistency
    const activeDays = heatmap.filter((d) => d.focus_minutes > 0).length;
    const pct = Math.round((activeDays / 90) * 100);
    insights.push({ emoji: '🎯', text: `Active ${pct}% of days in the last 90 days` });

    // Streak insight
    if ((totals?.streak ?? 0) >= 7) insights.push({ emoji: '🔥', text: `${totals!.streak}-day streak — you're in the zone!` });
    else if ((totals?.streak ?? 0) === 0) insights.push({ emoji: '💡', text: 'Complete a session today to start a streak' });

    // Long session detector
    const longSessions = history.filter((s) => s.duration >= 45 * 60).length;
    if (longSessions > 0) insights.push({ emoji: '🏋️', text: `${longSessions} deep work session${longSessions > 1 ? 's' : ''} over 45 minutes` });
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.07) 0%, transparent 70%)' }} />

      {/* Nav */}
      <div className="sticky top-0 z-20 px-6 py-4 relative"
        style={{ background: 'rgba(6,6,8,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, var(--accent), transparent 40%)' }} />
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-white font-black tracking-tight" style={{ letterSpacing: '-0.02em' }}>Analytics</h1>
            <p className="label mt-0.5">Your focus journey</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-white/10 border-t-brand-400 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <BigStat icon={<Clock className="w-4 h-4" />}       label="Hours focused (all time)" value={`${totals?.hours ?? 0}h`}       color="#a78bfa" delay={0.05} />
            <BigStat icon={<Zap className="w-4 h-4" fill="currentColor" />} label="Total sessions" value={totals?.sessions ?? 0} color="#fbbf24" delay={0.08} />
            <BigStat icon={<Calendar className="w-4 h-4" />}    label="Active days"              value={totals?.activeDays ?? 0}        color="#34d399" delay={0.11} />
            <BigStat icon={<CheckSquare className="w-4 h-4" />} label="Tasks completed"          value={totals?.tasksCompleted ?? 0}    color="#60a5fa" delay={0.14} />
          </div>

          {/* Personal bests */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="grid grid-cols-3 gap-3">
            <div className="card-dark p-4 text-center">
              <Flame className="w-5 h-5 text-orange-400 mx-auto mb-2" fill="currentColor" />
              <p className="text-2xl font-bold text-white tabular-nums">{totals?.streak ?? 0}d</p>
              <p className="text-white/30 text-xs mt-0.5">Current streak</p>
            </div>
            <div className="card-dark p-4 text-center">
              <Star className="w-5 h-5 text-brand-400 mx-auto mb-2" fill="currentColor" />
              <p className="text-2xl font-bold text-white tabular-nums">Lv {totals?.level ?? 1}</p>
              <p className="text-white/30 text-xs mt-0.5">Current level</p>
            </div>
            <div className="card-dark p-4 text-center">
              <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white tabular-nums">
                {bestMonth ? `${Math.round(Number(bestMonth.minutes) / 60)}h` : '—'}
              </p>
              <p className="text-white/30 text-xs mt-0.5">Best month ({bestMonth?.month ?? '—'})</p>
            </div>
          </motion.div>

          {/* Focus insights */}
          {insights.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}
              className="card-dark p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-yellow-400" fill="currentColor" />
                <p className="text-white font-semibold text-sm">Focus Insights</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {insights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-lg leading-none">{ins.emoji}</span>
                    <p className="text-white/60 text-xs leading-relaxed">{ins.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Activity heatmap */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="card-dark p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-white font-semibold text-sm">Activity</p>
                <p className="text-white/25 text-xs mt-0.5">Last 90 days of focus sessions</p>
              </div>
              <span className="text-brand-400 text-sm font-bold">{heatmap.filter((d) => d.focus_minutes > 0).length} active days</span>
            </div>
            <Heatmap data={heatmap} />
          </motion.div>

          {/* Monthly chart */}
          {monthly.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
              className="card-dark p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-white font-semibold text-sm">Monthly Focus</p>
                  <p className="text-white/25 text-xs mt-0.5">Minutes per month</p>
                </div>
                <span className="text-white/30 text-xs">
                  {Math.floor(totalMin / 60)}h {totalMin % 60}m total
                </span>
              </div>
              <MonthlyChart bars={monthly} />
            </motion.div>
          )}

          {/* Session history */}
          {history.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.30 }}
              className="card-dark p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-semibold text-sm">Session History</p>
                  <p className="text-white/25 text-xs mt-0.5">Last 50 completed sessions</p>
                </div>
                <button onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                  style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {history.map((s) => {
                  const mins = Math.round(s.duration / 60);
                  const date = new Date(s.ended_at);
                  return (
                    <div key={s.id} className="px-3 py-2 rounded-xl transition-colors hover:bg-white/[0.03]">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: s.type === 'pomodoro' ? '#a78bfa' : s.type === 'short_break' ? '#34d399' : '#60a5fa' }} />
                        <span className="text-white/60 text-xs capitalize flex-1">{s.type.replace('_', ' ')}</span>
                        <span className="text-white/30 text-xs">{mins}m</span>
                        <span className="text-yellow-400/70 text-xs font-medium">+{s.xp_earned} XP</span>
                        <span className="text-white/20 text-xs w-20 text-right">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                      {s.notes && (
                        <p className="text-white/30 text-xs mt-1 ml-5 italic">{s.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Empty state */}
          {totals?.sessions === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="text-center py-16">
              <div className="text-5xl mb-4">📊</div>
              <p className="text-white/40 font-semibold">No data yet</p>
              <p className="text-white/20 text-sm mt-1">Complete your first focus session to start seeing stats</p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};
