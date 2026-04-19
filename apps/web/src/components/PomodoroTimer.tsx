import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Zap, Settings2, RotateCcw, Maximize2, PictureInPicture2 } from 'lucide-react';

type Mode = 'work' | 'shortBreak' | 'longBreak';

const DEFAULT_DURATIONS: Record<Mode, number> = { work: 25, shortBreak: 5, longBreak: 15 };
const STORAGE_KEY       = 'kingsmode_timer_durations';
const MUTE_KEY          = 'kingsmode_timer_mute';

// ── Alarm sound (Web Audio API chime) ─────────────────────
const playAlarm = (muted: boolean) => {
  if (muted) return;
  try {
    const ctx  = new AudioContext();
    const play = (freq: number, startAt: number, duration: number) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + startAt);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + duration);
    };
    // C major arpeggio: C5 → E5 → G5 → C6
    play(523, 0.0,  0.5);
    play(659, 0.25, 0.5);
    play(784, 0.5,  0.5);
    play(1047,0.75, 0.8);
    setTimeout(() => ctx.close(), 2500);
  } catch { /**/ }
};

const loadDurations = (): Record<Mode, number> => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return { ...DEFAULT_DURATIONS, ...JSON.parse(s) };
  } catch { /**/ }
  return { ...DEFAULT_DURATIONS };
};

const MODE_META: Record<Mode, { label: string }> = {
  work:       { label: 'Focus'       },
  shortBreak: { label: 'Short Break' },
  longBreak:  { label: 'Long Break'  },
};

const MODE_COLOR: Record<Mode, string> = {
  work: '#22c55e', shortBreak: '#3b82f6', longBreak: '#8b5cf6',
};

// ── Flip Card ─────────────────────────────────────────────
const FlipCard = ({ value, size = 'md' }: { value: string; size?: 'sm' | 'md' | 'xl' }) => {
  const [displayed, setDisplayed] = useState(value);
  const [prev, setPrev]           = useState(value);
  const [phase, setPhase]         = useState<'idle' | 'top' | 'bottom'>('idle');

  useEffect(() => {
    if (value === displayed) return;
    setPrev(displayed);
    setPhase('top');
    const t1 = setTimeout(() => { setDisplayed(value); setPhase('bottom'); }, 250);
    const t2 = setTimeout(() => setPhase('idle'), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [value]);

  const sizes = {
    sm: { w: 100, h: 108, fs: '4rem',   gap: 0.52 },
    md: { w: 160, h: 172, fs: '6.5rem', gap: 0.52 },
    xl: { w: 280, h: 300, fs: '11.5rem',gap: 0.52 },
  };
  const s = sizes[size];
  const numStyle: React.CSSProperties = {
    fontSize: s.fs, fontWeight: 800, lineHeight: 1,
    color: '#fff', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums',
  };

  return (
    <div style={{ position: 'relative', width: s.w, height: s.h, perspective: 600 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#141414' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden', paddingBottom: 4 }}>
          <div style={{ ...numStyle, marginBottom: `-${s.gap}em` }}>{displayed}</div>
        </div>
        <div style={{ height: 2, background: '#000', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'hidden', paddingTop: 4 }}>
          <div style={{ ...numStyle, marginTop: `-${s.gap}em` }}>{displayed}</div>
        </div>
      </div>
      {phase === 'top' && (
        <motion.div
          style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '50%', transformOrigin: 'bottom center', zIndex: 10, overflow: 'hidden', borderRadius: '20px 20px 0 0', background: '#141414', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}
          initial={{ rotateX: 0 }} animate={{ rotateX: -90 }} transition={{ duration: 0.25, ease: 'easeIn' }}
        >
          <div style={{ ...numStyle, marginBottom: `-${s.gap}em` }}>{prev}</div>
        </motion.div>
      )}
      {phase === 'bottom' && (
        <motion.div
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%', transformOrigin: 'top center', zIndex: 10, overflow: 'hidden', borderRadius: '0 0 20px 20px', background: '#181818', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 4 }}
          initial={{ rotateX: 90 }} animate={{ rotateX: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div style={{ ...numStyle, marginTop: `-${s.gap}em` }}>{displayed}</div>
        </motion.div>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: '#000', zIndex: 20, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '50%', borderRadius: '20px 20px 0 0', background: 'linear-gradient(to bottom, rgba(255,255,255,0.03), transparent)', zIndex: 21, pointerEvents: 'none' }} />
    </div>
  );
};

// ── PiP Mini content (rendered into the floating window) ──
const MiniTimerContent = ({
  mode, mins, secs, running, pomodoroCount, color, progressPct,
  onToggle, onReset, onSwitchMode,
}: {
  mode: Mode; mins: string; secs: string; running: boolean;
  pomodoroCount: number; color: string; progressPct: number;
  onToggle: () => void; onReset: () => void; onSwitchMode: (m: Mode) => void;
}) => {
  const btnLabel = running
    ? (mode === 'work' ? 'Pause' : 'Pause Break')
    : (mode === 'work' ? 'Start Focus' : 'Start Break');

  return (
    <div style={{ width: '100%', height: '100%', background: '#0d0d0d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 20, boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif', userSelect: 'none' }}>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, width: '100%' }}>
        {(Object.keys(MODE_META) as Mode[]).map((m) => (
          <button key={m} onClick={() => onSwitchMode(m)}
            style={{ flex: 1, padding: '6px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600, transition: 'all 0.2s',
              background: mode === m ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: mode === m ? '#fff' : 'rgba(255,255,255,0.3)' }}>
            {MODE_META[m].label}
          </button>
        ))}
      </div>

      {/* Label */}
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, margin: 0 }}>
        {MODE_META[mode].label}
      </p>

      {/* Flip cards */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <FlipCard value={mins} size="sm" />
        <FlipCard value={secs} size="sm" />
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
      <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: color, borderRadius: 99, transition: 'width 0.5s' }} />
      </div>

      {/* Buttons */}
      <button onClick={onToggle}
        style={{ width: '100%', background: color, border: 'none', borderRadius: 14, padding: '12px 0', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}>
        {btnLabel}
      </button>

      <button onClick={onReset}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
        ↺ Reset
      </button>
    </div>
  );
};

// ── Presets ────────────────────────────────────────────────
interface Preset { name: string; work: number; shortBreak: number; longBreak: number }
const PRESETS_KEY = 'kingsmode_presets';
const BUILT_IN_PRESETS: Preset[] = [
  { name: 'Standard',  work: 25, shortBreak: 5,  longBreak: 15 },
  { name: 'Deep Work', work: 50, shortBreak: 10, longBreak: 20 },
  { name: 'Short',     work: 15, shortBreak: 3,  longBreak: 10 },
];
const loadCustomPresets = (): Preset[] => {
  try { const s = localStorage.getItem(PRESETS_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
};

// ── Settings Panel ─────────────────────────────────────────
const SettingsPanel = ({ durations, mode, muted, onSave, onClose, onToggleMute }: {
  durations: Record<Mode, number>; mode: Mode; muted: boolean;
  onSave: (d: Record<Mode, number>) => void; onClose: () => void; onToggleMute: () => void;
}) => {
  const [draft,   setDraft]   = useState({ ...durations });
  const [customs, setCustoms] = useState<Preset[]>(loadCustomPresets);
  const [saving,  setSaving]  = useState(false);
  const [newName, setNewName] = useState('');

  const applyPreset = (p: Preset) => setDraft({ work: p.work, shortBreak: p.shortBreak, longBreak: p.longBreak });

  const saveCustom = () => {
    if (!newName.trim()) return;
    const preset: Preset = { name: newName.trim(), work: draft.work, shortBreak: draft.shortBreak, longBreak: draft.longBreak };
    const next = [...customs, preset];
    setCustoms(next);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    setNewName(''); setSaving(false);
  };

  const deleteCustom = (i: number) => {
    const next = customs.filter((_, idx) => idx !== i);
    setCustoms(next);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
  };

  const allPresets = [...BUILT_IN_PRESETS, ...customs];

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="w-full overflow-hidden">
      <div className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/5">

        {/* Preset buttons */}
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2">Presets</p>
          <div className="flex flex-wrap gap-1.5">
            {allPresets.map((p, i) => {
              const isCustom = i >= BUILT_IN_PRESETS.length;
              return (
                <div key={i} className="relative group/preset">
                  <button onClick={() => applyPreset(p)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {p.name} <span className="text-white/25">{p.work}/{p.shortBreak}</span>
                  </button>
                  {isCustom && (
                    <button onClick={() => deleteCustom(i - BUILT_IN_PRESETS.length)}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500/80 text-white text-[9px] flex items-center justify-center opacity-0 group-hover/preset:opacity-100 transition-opacity">
                      ×
                    </button>
                  )}
                </div>
              );
            })}
            <button onClick={() => setSaving((v) => !v)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={{ background: saving ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)', color: saving ? '#a78bfa' : 'rgba(255,255,255,0.3)', border: `1px solid ${saving ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
              + Save current
            </button>
          </div>
          {saving && (
            <div className="flex gap-1.5 mt-2">
              <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveCustom()}
                placeholder="Preset name…"
                className="flex-1 bg-white/8 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none border border-white/10 focus:border-white/25 placeholder:text-white/20"
                style={{ background: 'rgba(255,255,255,0.06)' }} />
              <button onClick={saveCustom}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: 'rgba(139,92,246,0.4)' }}>Save</button>
            </div>
          )}
        </div>

        <div className="border-t border-white/5 pt-3">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">Custom Durations (minutes)</p>
          {(Object.keys(MODE_META) as Mode[]).map((m) => (
            <div key={m} className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">{MODE_META[m].label}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setDraft((d) => ({ ...d, [m]: Math.max(d[m] - 1, 1) }))} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all">−</button>
                <input type="number" min={1} max={m === 'work' ? 120 : 60} value={draft[m]}
                  onChange={(e) => setDraft((d) => ({ ...d, [m]: parseInt(e.target.value) || 1 }))}
                  className="w-12 text-center bg-white/10 text-white text-sm font-bold rounded-lg py-1 outline-none border border-white/10 focus:border-white/30" />
                <button onClick={() => setDraft((d) => ({ ...d, [m]: d[m] + 1 }))} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all">+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Alarm toggle */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <span className="text-white/60 text-sm">Alarm sound</span>
          <button onClick={onToggleMute}
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            style={{ background: muted ? 'rgba(255,255,255,0.06)' : 'rgba(34,197,94,0.15)', color: muted ? 'rgba(255,255,255,0.3)' : '#4ade80', border: `1px solid ${muted ? 'rgba(255,255,255,0.08)' : 'rgba(34,197,94,0.3)'}` }}>
            {muted ? '🔇 Off' : '🔔 On'}
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { const c = { work: Math.min(Math.max(draft.work,1),120), shortBreak: Math.min(Math.max(draft.shortBreak,1),60), longBreak: Math.min(Math.max(draft.longBreak,1),60) }; onSave(c); }}
            className="flex-1 py-2 rounded-xl text-white text-xs font-semibold" style={{ background: MODE_COLOR[mode] }}>Save & Apply</button>
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-white/5 text-white/50 hover:text-white text-xs font-semibold">Cancel</button>
        </div>
      </div>
    </motion.div>
  );
};

// ── Main Timer ────────────────────────────────────────────
interface Props {
  onSessionComplete: (durationSeconds: number, notes?: string) => Promise<{ xpEarned: number; leveledUp: boolean }>;
}

export const PomodoroTimer = ({ onSessionComplete }: Props) => {
  const [durations, setDurations]         = useState<Record<Mode, number>>(loadDurations);
  const [muted, setMuted]                 = useState(() => localStorage.getItem(MUTE_KEY) === '1');
  const [showSettings, setShowSettings]   = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mode, setMode]                   = useState<Mode>('work');
  const [timeLeft, setTimeLeft]           = useState(() => loadDurations().work * 60);
  const [running, setRunning]             = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [xpPopup, setXpPopup]             = useState<{ xp: number; levelUp: boolean } | null>(null);
  const [notePrompt, setNotePrompt]       = useState<{ elapsed: number } | null>(null);
  const [noteText, setNoteText]           = useState('');
  const [fullscreen, setFullscreen]       = useState(false);
  const [pipActive, setPipActive]         = useState(false);
  const pipRootRef                        = useRef<ReturnType<typeof createRoot> | null>(null);
  const sessionStartRef                   = useRef<number | null>(null);
  const intervalRef                       = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalDuration = durations[mode] * 60;
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  const progressPct = ((totalDuration - timeLeft) / totalDuration) * 100;
  const color = MODE_COLOR[mode];

  const submitSession = useCallback(async (elapsed: number, notes?: string) => {
    const newCount = pomodoroCount + 1;
    setPomodoroCount(newCount);
    try {
      const result = await onSessionComplete(elapsed, notes);
      setXpPopup({ xp: result.xpEarned, levelUp: result.leveledUp });
      setTimeout(() => setXpPopup(null), 3000);
    } catch { /**/ }
    const next: Mode = newCount % 4 === 0 ? 'longBreak' : 'shortBreak';
    setMode(next);
    setTimeLeft(durations[next] * 60);
    setNotePrompt(null);
    setNoteText('');
  }, [pomodoroCount, onSessionComplete, durations]);

  const handleComplete = useCallback(async () => {
    setRunning(false);
    playAlarm(muted);
    if (mode === 'work' && sessionStartRef.current) {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      setNotePrompt({ elapsed });
    } else {
      setMode('work');
      setTimeLeft(durations.work * 60);
    }
    sessionStartRef.current = null;
  }, [mode, durations, muted]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) { clearInterval(intervalRef.current!); handleComplete(); return 0; }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current!);
    }
    return () => clearInterval(intervalRef.current!);
  }, [running, handleComplete]);

  // Keyboard shortcuts — skip when typing in an input
  const toggleRunRef  = useRef<() => void>(() => {});
  const resetRef      = useRef<() => void>(() => {});
  const switchModeRef = useRef<(m: Mode) => void>(() => {});
  useEffect(() => { toggleRunRef.current  = () => { if (!running && timeLeft === totalDuration) sessionStartRef.current = Date.now(); setRunning((v) => !v); }; });
  useEffect(() => { resetRef.current      = () => { setRunning(false); setTimeLeft(durations[mode] * 60); sessionStartRef.current = null; }; });
  useEffect(() => { switchModeRef.current = (m: Mode) => { setRunning(false); setMode(m); setTimeLeft(durations[m] * 60); sessionStartRef.current = null; }; });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.key) {
        case ' ':       e.preventDefault(); toggleRunRef.current(); break;
        case 'r': case 'R': resetRef.current(); break;
        case '1':       switchModeRef.current('work'); break;
        case '2':       switchModeRef.current('shortBreak'); break;
        case '3':       switchModeRef.current('longBreak'); break;
        case 'f': case 'F': setFullscreen((v) => !v); break;
        case 'Escape':  setFullscreen(false); setShowShortcuts(false); break;
        case '?':       setShowShortcuts((v) => !v); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Keep PiP window in sync with timer state
  useEffect(() => {
    if (!pipRootRef.current || !pipActive) return;
    pipRootRef.current.render(
      <MiniTimerContent
        mode={mode} mins={mins} secs={secs} running={running}
        pomodoroCount={pomodoroCount} color={color} progressPct={progressPct}
        onToggle={toggleRun} onReset={reset} onSwitchMode={switchMode}
      />
    );
  });

  const toggleRun = () => {
    if (!running && timeLeft === totalDuration) sessionStartRef.current = Date.now();
    setRunning((v) => !v);
  };

  const reset = () => {
    setRunning(false);
    setTimeLeft(durations[mode] * 60);
    sessionStartRef.current = null;
  };

  const switchMode = (m: Mode) => {
    setRunning(false);
    setMode(m);
    setTimeLeft(durations[m] * 60);
    sessionStartRef.current = null;
  };

  const saveSettings = (c: Record<Mode, number>) => {
    setDurations(c);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    setRunning(false);
    setTimeLeft(c[mode] * 60);
    sessionStartRef.current = null;
    setShowSettings(false);
  };

  // Open floating window that stays on top of ALL apps (Document PiP API)
  const openPiP = async () => {
    const pip = (window as any).documentPictureInPicture;
    if (!pip) {
      alert('Your browser does not support floating windows.\nPlease use Chrome 116 or newer.');
      return;
    }
    try {
      const pipWindow: Window = await pip.requestWindow({ width: 280, height: 500 });

      // Copy all page styles into the PiP window so components render correctly
      [...document.styleSheets].forEach((sheet) => {
        try {
          const cssText = [...sheet.cssRules].map((r) => r.cssText).join('');
          const style = pipWindow.document.createElement('style');
          style.textContent = cssText;
          pipWindow.document.head.appendChild(style);
        } catch {
          if (sheet.href) {
            const link = pipWindow.document.createElement('link');
            link.rel = 'stylesheet'; link.href = sheet.href;
            pipWindow.document.head.appendChild(link);
          }
        }
      });

      // Base styles for PiP doc
      const base = pipWindow.document.createElement('style');
      base.textContent = `* { margin: 0; padding: 0; box-sizing: border-box; } body { background: #0d0d0d; overflow: hidden; }`;
      pipWindow.document.head.appendChild(base);

      const container = pipWindow.document.createElement('div');
      container.style.cssText = 'width:100vw;height:100vh;';
      pipWindow.document.body.appendChild(container);

      pipRootRef.current = createRoot(container);
      setPipActive(true);

      // Initial render
      pipRootRef.current.render(
        <MiniTimerContent
          mode={mode} mins={mins} secs={secs} running={running}
          pomodoroCount={pomodoroCount} color={color} progressPct={progressPct}
          onToggle={toggleRun} onReset={reset} onSwitchMode={switchMode}
        />
      );

      pipWindow.addEventListener('pagehide', () => {
        pipRootRef.current = null;
        setPipActive(false);
      });
    } catch (e: any) {
      if (e?.name !== 'NotAllowedError') {
        alert('Could not open floating window. Make sure you are using Chrome 116+.');
      }
    }
  };

  const btnLabel = running
    ? (mode === 'work' ? 'Pause Focus' : 'Pause Break')
    : (timeLeft === totalDuration ? (mode === 'work' ? 'Start Focus' : 'Start Break') : 'Resume');

  // ── Fullscreen overlay ─────────────────────────────────
  const fullscreenPortal = fullscreen && createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
      <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 10 }}>
        <button onClick={() => setFullscreen(false)}
          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, padding: '8px 18px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12 }}>
          Exit (Esc)
        </button>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>
        {MODE_META[mode].label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <FlipCard value={mins} size="xl" />
        <FlipCard value={secs} size="xl" />
      </div>
      {mode === 'work' && (
        <div style={{ display: 'flex', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < pomodoroCount % 4 ? color : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
          ))}
        </div>
      )}
      <div style={{ width: 560, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: color, borderRadius: 99, transition: 'width 0.5s' }} />
      </div>
      <button onClick={toggleRun}
        style={{ background: color, border: 'none', borderRadius: 20, padding: '16px 64px', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em' }}>
        {btnLabel}
      </button>
      <AnimatePresence>
        {xpPopup && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.4)', borderRadius: 14, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} color="#facc15" fill="#facc15" />
              <span style={{ color: '#fde047', fontWeight: 700, fontSize: 16 }}>+{xpPopup.xp} XP</span>
            </div>
            {xpPopup.levelUp && <div style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 12, padding: '6px 16px' }}><span style={{ color: '#c4b5fd', fontWeight: 700, fontSize: 13 }}>⬆️ Level Up!</span></div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );

  // ── Normal view ────────────────────────────────────────
  return (
    <>
      {fullscreenPortal}

      <div className="flex flex-col items-center gap-4 w-full">

        {/* Mode tabs + controls */}
        <div className="flex items-center gap-2 w-full justify-between">
          <div className="flex gap-0.5 bg-white/5 rounded-xl p-1">
            {(Object.keys(MODE_META) as Mode[]).map((m) => (
              <button key={m} onClick={() => switchMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === m ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>
                {MODE_META[m].label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={() => setShowSettings((v) => !v)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${showSettings ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white bg-white/5'}`}
              title="Custom durations">
              <Settings2 className="w-4 h-4" />
            </button>
            <button onClick={openPiP}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${pipActive ? 'bg-green-500/20 text-green-400' : 'text-white/30 hover:text-white bg-white/5'}`}
              title="Float on top of all windows (Chrome 116+)">
              <PictureInPicture2 className="w-4 h-4" />
            </button>
            <button onClick={() => setFullscreen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white bg-white/5 transition-all"
              title="Full screen (F)">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={() => setShowShortcuts((v) => !v)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${showShortcuts ? 'bg-white/15 text-white' : 'text-white/25 hover:text-white bg-white/5'}`}
              title="Keyboard shortcuts (?)">
              ?
            </button>
          </div>
        </div>

        {/* Shortcuts legend */}
        <AnimatePresence>
          {showShortcuts && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="w-full overflow-hidden">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 rounded-xl text-xs"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  ['Space', 'Start / Pause'],
                  ['R', 'Reset timer'],
                  ['1', 'Focus mode'],
                  ['2', 'Short break'],
                  ['3', 'Long break'],
                  ['F', 'Fullscreen'],
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 rounded-md font-mono font-bold text-white/70"
                      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                      {key}
                    </kbd>
                    <span className="text-white/35">{desc}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PiP hint */}
        {pipActive && (
          <p className="text-green-400/60 text-xs text-center">
            Timer is floating on top of all windows ↗
          </p>
        )}

        {/* Settings */}
        <AnimatePresence>
          {showSettings && (
            <SettingsPanel
              durations={durations} mode={mode} muted={muted}
              onSave={saveSettings} onClose={() => setShowSettings(false)}
              onToggleMute={() => {
                const next = !muted;
                setMuted(next);
                localStorage.setItem(MUTE_KEY, next ? '1' : '0');
              }}
            />
          )}
        </AnimatePresence>

        {/* Flip clock */}
        <div className="relative flex flex-col items-center gap-3">
          <AnimatePresence>
            {xpPopup && (
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.8 }}
                className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none z-30">
                <div className="bg-yellow-400/20 border border-yellow-400/40 rounded-xl px-4 py-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" fill="currentColor" />
                  <span className="text-yellow-300 font-bold text-sm">+{xpPopup.xp} XP</span>
                </div>
                {xpPopup.levelUp && <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="bg-purple-600/30 border border-purple-400/40 rounded-xl px-4 py-1.5"><span className="text-purple-300 font-bold text-xs">⬆️ Level Up!</span></motion.div>}
              </motion.div>
            )}
          </AnimatePresence>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-[0.2em]">{MODE_META[mode].label}</p>
          <FlipCard value={mins} size="md" />
          <FlipCard value={secs} size="md" />
          {mode === 'work' && (
            <div className="flex gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i < pomodoroCount % 4 ? 'bg-green-400' : 'bg-white/15'}`} />
              ))}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full h-0.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: color }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5 }} />
        </div>

        {/* Note prompt (shown after a work session completes) */}
        <AnimatePresence>
          {notePrompt && (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="w-full rounded-2xl p-4 space-y-3"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <p className="text-green-400 text-xs font-semibold">🎉 Session complete! Add a quick note?</p>
              <textarea
                autoFocus
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="What did you work on? (optional)"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-white/25 placeholder:text-white/15 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => submitSession(notePrompt.elapsed, noteText || undefined)}
                  className="flex-1 py-2 rounded-xl text-white text-xs font-bold"
                  style={{ background: '#22c55e' }}>
                  Save & Continue
                </button>
                <button onClick={() => submitSession(notePrompt.elapsed)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white/40 hover:text-white/70 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  Skip
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start button */}
        {!notePrompt && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={toggleRun}
            className="w-full py-3 rounded-2xl text-white font-bold text-sm tracking-wide" style={{ background: color }}>
            {btnLabel}
          </motion.button>
        )}

        {/* Reset + count */}
        <div className="flex items-center justify-between w-full">
          <button onClick={reset} className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          {pomodoroCount > 0 && (
            <div className="flex items-center gap-1.5 text-white/30 text-xs">
              {mode !== 'work' ? <Coffee className="w-3 h-3 text-blue-400" /> : <Zap className="w-3 h-3 text-green-400" fill="currentColor" />}
              {pomodoroCount} session{pomodoroCount !== 1 ? 's' : ''} done
            </div>
          )}
        </div>
      </div>
    </>
  );
};
