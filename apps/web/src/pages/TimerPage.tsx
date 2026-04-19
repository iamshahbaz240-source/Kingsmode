import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, RotateCcw, GripVertical } from 'lucide-react';

type Mode = 'work' | 'shortBreak' | 'longBreak';

const MODE_LABEL: Record<Mode, string> = { work: 'Focus', shortBreak: 'Short Break', longBreak: 'Long Break' };
const MODE_COLOR: Record<Mode, string> = { work: '#22c55e', shortBreak: '#3b82f6', longBreak: '#8b5cf6' };
const STORAGE_KEY = 'kingsmode_timer_durations';

const loadDurations = (): Record<Mode, number> => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return { work: 25, shortBreak: 5, longBreak: 15, ...JSON.parse(s) };
  } catch { /**/ }
  return { work: 25, shortBreak: 5, longBreak: 15 };
};

// ── Flip Card ─────────────────────────────────────────────
const FlipCard = ({ value }: { value: string }) => {
  const [displayed, setDisplayed] = useState(value);
  const [prev, setPrev]           = useState(value);
  const [phase, setPhase]         = useState<'idle' | 'top' | 'bottom'>('idle');

  useEffect(() => {
    if (value === displayed) return;
    setPrev(displayed);
    setPhase('top');
    const t1 = setTimeout(() => { setDisplayed(value); setPhase('bottom'); }, 220);
    const t2 = setTimeout(() => setPhase('idle'), 460);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [value]);

  const numStyle: React.CSSProperties = {
    fontSize: '5rem', fontWeight: 800, lineHeight: 1,
    color: '#fff', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums',
  };
  const W = 140, H = 150;

  return (
    <div style={{ position: 'relative', width: W, height: H, perspective: 500 }}>
      {/* Static */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#141414' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden', paddingBottom: 3 }}>
          <div style={{ ...numStyle, marginBottom: '-0.52em' }}>{displayed}</div>
        </div>
        <div style={{ height: 2, background: '#000', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'hidden', paddingTop: 3 }}>
          <div style={{ ...numStyle, marginTop: '-0.52em' }}>{displayed}</div>
        </div>
      </div>
      {/* Flip top out */}
      {phase === 'top' && (
        <motion.div
          style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '50%', transformOrigin: 'bottom center', zIndex: 10, overflow: 'hidden', borderRadius: '16px 16px 0 0', background: '#141414', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 3 }}
          initial={{ rotateX: 0 }} animate={{ rotateX: -90 }} transition={{ duration: 0.22, ease: 'easeIn' }}
        >
          <div style={{ ...numStyle, marginBottom: '-0.52em' }}>{prev}</div>
        </motion.div>
      )}
      {/* Flip bottom in */}
      {phase === 'bottom' && (
        <motion.div
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%', transformOrigin: 'top center', zIndex: 10, overflow: 'hidden', borderRadius: '0 0 16px 16px', background: '#181818', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 3 }}
          initial={{ rotateX: 90 }} animate={{ rotateX: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <div style={{ ...numStyle, marginTop: '-0.52em' }}>{displayed}</div>
        </motion.div>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: '#000', zIndex: 20, pointerEvents: 'none' }} />
    </div>
  );
};

// ── Timer Page (runs in popup window) ─────────────────────
export const TimerPage = () => {
  // Read initial state passed via URL params
  const params     = new URLSearchParams(window.location.search);
  const initMode   = (params.get('mode') as Mode) || 'work';
  const initTime   = parseInt(params.get('timeLeft') || '0') || null;
  const durations  = loadDurations();

  const [mode, setMode]     = useState<Mode>(initMode);
  const [timeLeft, setTimeLeft] = useState(initTime ?? durations[initMode] * 60);
  const [running, setRunning]   = useState(params.get('running') === 'true');
  const [pomodoroCount, setPomodoroCount] = useState(parseInt(params.get('count') || '0'));
  const [xpPopup, setXpPopup]   = useState<{ xp: number } | null>(null);
  const sessionStartRef = useRef<number | null>(running ? Date.now() : null);
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalDuration = durations[mode] * 60;
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  const color = MODE_COLOR[mode];
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  // Notify opener about session complete
  const notifyOpener = useCallback((elapsed: number) => {
    try {
      window.opener?.postMessage({ type: 'KINGSMODE_SESSION_COMPLETE', elapsed }, '*');
    } catch { /**/ }
  }, []);

  // Sync state to opener continuously
  const syncToOpener = useCallback((m: Mode, t: number, r: boolean, count: number) => {
    try {
      window.opener?.postMessage({ type: 'KINGSMODE_TIMER_SYNC', mode: m, timeLeft: t, running: r, count }, '*');
    } catch { /**/ }
  }, []);

  const handleComplete = useCallback(async () => {
    setRunning(false);
    if (mode === 'work' && sessionStartRef.current) {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);
      notifyOpener(elapsed);
      setXpPopup({ xp: 25 });
      setTimeout(() => setXpPopup(null), 3000);
      const next: Mode = newCount % 4 === 0 ? 'longBreak' : 'shortBreak';
      setMode(next);
      setTimeLeft(durations[next] * 60);
      syncToOpener(next, durations[next] * 60, false, newCount);
    } else {
      setMode('work');
      setTimeLeft(durations.work * 60);
      syncToOpener('work', durations.work * 60, false, pomodoroCount);
    }
    sessionStartRef.current = null;
  }, [mode, pomodoroCount, notifyOpener, syncToOpener, durations]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          const next = t - 1;
          if (next <= 0) { clearInterval(intervalRef.current!); handleComplete(); return 0; }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current!);
    }
    return () => clearInterval(intervalRef.current!);
  }, [running, handleComplete]);

  // Listen for commands from main window
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data?.type?.startsWith('KINGSMODE_CMD')) return;
      const { type, mode: m, timeLeft: t, count } = e.data;
      if (type === 'KINGSMODE_CMD_SYNC') {
        setMode(m); setTimeLeft(t); setPomodoroCount(count ?? 0);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const toggleRun = () => {
    const next = !running;
    if (next && timeLeft === totalDuration) sessionStartRef.current = Date.now();
    setRunning(next);
    syncToOpener(mode, timeLeft, next, pomodoroCount);
  };

  const reset = () => {
    setRunning(false);
    setTimeLeft(durations[mode] * 60);
    sessionStartRef.current = null;
    syncToOpener(mode, durations[mode] * 60, false, pomodoroCount);
  };

  const switchMode = (m: Mode) => {
    setRunning(false);
    setMode(m);
    setTimeLeft(durations[m] * 60);
    sessionStartRef.current = null;
    syncToOpener(m, durations[m] * 60, false, pomodoroCount);
  };

  const btnLabel = running
    ? (mode === 'work' ? 'Pause' : 'Pause Break')
    : (timeLeft === totalDuration ? (mode === 'work' ? 'Start Focus' : 'Start Break') : 'Resume');

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0d0d0d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, userSelect: 'none', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>

      {/* Drag hint */}
      <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
        <GripVertical size={12} /> drag window to reposition
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4 }}>
        {(['work', 'shortBreak', 'longBreak'] as Mode[]).map((m) => (
          <button key={m} onClick={() => switchMode(m)}
            style={{ padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: mode === m ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: mode === m ? '#fff' : 'rgba(255,255,255,0.35)' }}>
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      {/* Mode label */}
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, margin: 0 }}>
        {MODE_LABEL[mode]}
      </p>

      {/* Flip cards */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <FlipCard value={mins} />
        <FlipCard value={secs} />
      </div>

      {/* Dots */}
      {mode === 'work' && (
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < pomodoroCount % 4 ? color : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div style={{ width: 280, height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: color, borderRadius: 99, transition: 'width 0.5s' }} />
      </div>

      {/* Buttons */}
      <button onClick={toggleRun}
        style={{ width: 280, background: color, border: 'none', borderRadius: 14, padding: '13px 0', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}>
        {btnLabel}
      </button>

      <button onClick={reset}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 12 }}>
        <RotateCcw size={12} /> Reset
      </button>

      {/* XP popup */}
      <AnimatePresence>
        {xpPopup && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.4)', borderRadius: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={14} color="#facc15" fill="#facc15" />
            <span style={{ color: '#fde047', fontWeight: 700, fontSize: 14 }}>+{xpPopup.xp} XP</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
