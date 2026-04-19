import { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, ArrowUpRight } from 'lucide-react';

// ── Data ──────────────────────────────────────────────────
const MARQUEE_ITEMS = [
  '⚡ Pomodoro Timer', '✦ Task Manager', '♪ Ambient Sounds',
  '◈ Habit Tracker', '▲ Analytics', '✦ XP & Levels',
  '⊕ Focus Mode', '◎ Session Notes', '⚡ Pomodoro Timer',
  '✦ Task Manager', '♪ Ambient Sounds', '◈ Habit Tracker',
];

const FEATURES = [
  {
    num: '01',
    title: 'Flip-clock Timer',
    body: 'A cinematic Pomodoro timer with mechanical flip-clock animation. Keyboard shortcuts, fullscreen, and Picture-in-Picture that floats above every app.',
    tag: 'Focus',
    color: '#22c55e',
  },
  {
    num: '02',
    title: 'Deep Analytics',
    body: 'GitHub-style activity heatmap, monthly charts, auto-generated focus insights, session history with notes, and one-click CSV export.',
    tag: 'Analytics',
    color: '#a78bfa',
  },
  {
    num: '03',
    title: 'Smart Tasks',
    body: 'Subtasks, color tags, recurring schedules, due dates, and priorities. Everything synced across your browser via the Chrome extension.',
    tag: 'Productivity',
    color: '#60a5fa',
  },
  {
    num: '04',
    title: 'Ambient Sounds',
    body: 'Six procedurally-generated soundscapes — rain, ocean, fire, café, brown noise, white noise. Plus direct Spotify playlist integration.',
    tag: 'Focus',
    color: '#34d399',
  },
  {
    num: '05',
    title: 'XP & Leveling',
    body: 'Earn XP every session, level up through six tiers from Beginner to Legend, maintain daily streaks. Your focus has consequences.',
    tag: 'Gamification',
    color: '#fbbf24',
  },
  {
    num: '06',
    title: 'Chrome Extension',
    body: 'Every new tab becomes your command centre — clock, tasks, background, and focus mode that auto-blocks distracting sites during sessions.',
    tag: 'Extension',
    color: '#f97316',
  },
];

const STATS = [
  { value: '6', label: 'Ambient soundscapes' },
  { value: '∞', label: 'Focus sessions' },
  { value: '100%', label: 'Free forever' },
  { value: '1', label: 'Tab to rule them all' },
];

// ── Marquee ───────────────────────────────────────────────
const Marquee = () => (
  <div className="relative overflow-hidden border-y border-white/[0.06] py-4 select-none"
    style={{ background: 'rgb(var(--dark-800))' }}>
    <div className="marquee-track">
      {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
        <span key={i} className="whitespace-nowrap px-8 text-xs font-bold tracking-[0.2em] uppercase text-white/25">
          {item}
        </span>
      ))}
    </div>
  </div>
);

// ── Feature Card ─────────────────────────────────────────
const FeatureCard = ({ f, i }: { f: typeof FEATURES[0]; i: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ delay: i * 0.07, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    className="group relative p-8 rounded-3xl cursor-default overflow-hidden"
    style={{ background: 'rgb(11,11,15)', border: '1px solid rgba(255,255,255,0.055)' }}
  >
    {/* Hover glow */}
    <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
      style={{ background: `radial-gradient(circle at 30% 30%, ${f.color}08, transparent 70%)` }} />

    {/* Top accent line */}
    <div className="absolute top-0 left-8 right-8 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style={{ background: `linear-gradient(90deg, transparent, ${f.color}60, transparent)` }} />

    <div className="relative z-10">
      <div className="flex items-start justify-between mb-6">
        <span className="label">{f.num}</span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: `${f.color}14`, color: f.color, border: `1px solid ${f.color}30` }}>
          {f.tag}
        </span>
      </div>
      <h3 className="text-white font-bold text-xl mb-3 tracking-tight">{f.title}</h3>
      <p className="text-white/35 text-sm leading-relaxed">{f.body}</p>
    </div>
  </motion.div>
);

// ── Main Landing Page ─────────────────────────────────────
export const LandingPage = () => {
  const navigate = useNavigate();
  const heroRef  = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY    = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  // Grain on body
  useEffect(() => {
    document.body.classList.add('grain');
    return () => document.body.classList.remove('grain');
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'rgb(var(--dark-900))' }}>

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50"
        style={{ background: 'rgba(6,6,8,0.75)', backdropFilter: 'blur(24px) saturate(180%)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Lime top stripe */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, var(--accent), transparent 50%)' }} />
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-dark-900 text-sm"
              style={{ background: 'var(--accent)' }}>
              K
            </div>
            <span className="text-white font-black tracking-tight">Kingsmode</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => navigate('/login')}
              className="text-sm font-semibold transition-colors px-3 py-1.5 hidden sm:block"
              style={{ color: 'rgba(255,255,255,0.45)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>
              Sign in
            </button>
            <button onClick={() => navigate('/register')}
              className="btn-shimmer flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-black text-dark-900"
              style={{ background: 'var(--accent)', boxShadow: '0 0 24px rgba(200,255,0,0.2)' }}>
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-10 overflow-hidden">

        {/* Background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 65%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(200,255,0,0.04) 0%, transparent 70%)' }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 flex flex-col items-center text-center px-6 max-w-6xl mx-auto">

          {/* Badge */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-10"
            style={{ background: 'rgba(200,255,0,0.08)', border: '1px solid rgba(200,255,0,0.2)', color: '#c8ff00' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Free forever · No subscription
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.8, ease: [0.22,1,0.36,1] }}
            className="font-black tracking-tight leading-[0.92] text-balance"
            style={{ fontSize: 'clamp(3.2rem, 10vw, 9rem)', letterSpacing: '-0.04em' }}>
            <span className="text-white">Focus</span><br />
            <span className="text-white">like a </span>
            <span className="gradient-text-lime">king.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7, ease: [0.22,1,0.36,1] }}
            className="mt-8 text-white/40 text-base sm:text-lg max-w-xl leading-relaxed">
            Pomodoro timer · Task manager · Habit tracker · Ambient sounds · Deep analytics. One app. Zero distractions.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6, ease: [0.22,1,0.36,1] }}
            className="mt-10 flex flex-col sm:flex-row items-center gap-3">
            <button onClick={() => navigate('/register')}
              className="btn-shimmer group flex items-center gap-2.5 px-8 py-4 rounded-2xl text-black font-black text-base transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{ background: 'var(--accent)' }}>
              Start for free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-white/50 font-semibold text-sm hover:text-white transition-colors border border-white/10 hover:border-white/20">
              Already have an account
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-16 sm:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-12 w-full max-w-2xl">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-white font-black tabular-nums" style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', letterSpacing: '-0.03em' }}>{s.value}</p>
                <p className="label mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="label">Scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            className="w-px h-8 rounded-full" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)' }} />
        </motion.div>
      </section>

      {/* ── Marquee ──────────────────────────────────────── */}
      <Marquee />

      {/* ── Timer Preview ────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22,1,0.36,1] }}
            className="relative rounded-[32px] overflow-hidden grain"
            style={{ background: 'rgb(10,10,14)', border: '1px solid rgba(255,255,255,0.06)' }}>

            {/* Top glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)', filter: 'blur(20px)' }} />

            <div className="relative z-10 py-16 sm:py-24 flex flex-col items-center gap-8 px-6">

              <span className="label">Focus Timer</span>

              {/* Flip cards */}
              <div className="flex items-center gap-3 sm:gap-5">
                {['25', '00'].map((v, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-center rounded-2xl sm:rounded-3xl"
                      style={{
                        width: 'clamp(100px, 20vw, 168px)',
                        height: 'clamp(108px, 22vw, 180px)',
                        background: 'linear-gradient(180deg, #161618, #111113)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.04) inset',
                      }}>
                      <span className="text-white font-black tabular-nums"
                        style={{ fontSize: 'clamp(3rem,10vw,6.5rem)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                        {v}
                      </span>
                    </div>
                    <p className="label text-center mt-2">{i === 0 ? 'min' : 'sec'}</p>
                  </div>
                ))}
              </div>

              {/* Mode tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                {['Focus', 'Short Break', 'Long Break'].map((m, i) => (
                  <span key={m} className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${i === 0 ? 'bg-white/12 text-white' : 'text-white/25'}`}>
                    {m}
                  </span>
                ))}
              </div>

              {/* Progress bar */}
              <div className="w-64 sm:w-80 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />

              {/* CTA button */}
              <div className="px-10 sm:px-16 py-3.5 rounded-2xl text-white font-bold text-sm"
                style={{ background: '#22c55e', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}>
                Start Focus
              </div>

              {/* Keyboard hint */}
              <p className="text-white/20 text-xs">Press <kbd className="px-1.5 py-0.5 rounded text-white/30" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>Space</kbd> to start · <kbd className="px-1.5 py-0.5 rounded text-white/30" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>F</kbd> for fullscreen</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Color-block Intro ────────────────────────────── */}
      <section className="py-8 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Built for', value: 'Deep\nWork.', bg: 'rgb(var(--brand-600))', color: '#fff' },
            { label: 'Designed for', value: 'Real\nResults.', bg: '#c8ff00', color: '#000' },
            { label: 'Made for', value: 'Every\nDay.', bg: 'rgb(14,14,18)', color: '#fff', border: true },
          ].map((block, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22,1,0.36,1] }}
              className="rounded-3xl p-8 sm:p-10"
              style={{
                background: block.bg,
                color: block.color,
                border: block.border ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
              <p className="text-xs font-bold tracking-[0.2em] uppercase mb-3"
                style={{ opacity: block.color === '#000' ? 0.5 : 0.45 }}>
                {block.label}
              </p>
              <p className="font-black leading-[0.9] whitespace-pre-line"
                style={{ fontSize: 'clamp(2.4rem, 5vw, 3.5rem)', letterSpacing: '-0.04em' }}>
                {block.value}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6 }} className="mb-14 sm:mb-16">
            <span className="label block mb-4">Everything you need</span>
            <h2 className="text-white font-black tracking-tight text-balance"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              No bloat.<br />Just what works.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f, i) => <FeatureCard key={i} f={f} i={i} />)}
          </div>
        </div>
      </section>

      {/* ── Second Marquee ───────────────────────────────── */}
      <div className="relative overflow-hidden border-y border-white/[0.06] py-5 select-none"
        style={{ background: 'rgb(var(--dark-800))' }}>
        <div className="marquee-track" style={{ animationDirection: 'reverse', animationDuration: '22s' }}>
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="whitespace-nowrap px-8 text-xs font-black tracking-[0.2em] uppercase"
              style={{ color: 'rgb(var(--brand-400))', opacity: 0.6 }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── CTA Section ──────────────────────────────────── */}
      <section className="py-24 sm:py-36 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22,1,0.36,1] }}
            className="relative rounded-[40px] overflow-hidden grain text-center px-8 py-20 sm:py-28"
            style={{ background: 'rgb(var(--brand-700))', border: '1px solid rgba(255,255,255,0.1)' }}>

            {/* Glow layers */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-48 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%)' }} />

            <div className="relative z-10">
              <span className="label text-white/40 block mb-6">Start today</span>
              <h2 className="text-white font-black tracking-tight text-balance mb-4"
                style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)', letterSpacing: '-0.04em', lineHeight: 0.95 }}>
                Your best work<br />starts now.
              </h2>
              <p className="text-white/50 text-base sm:text-lg max-w-md mx-auto mb-10 leading-relaxed">
                Join thousands of builders and creators who use Kingsmode to do their best work every single day.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={() => navigate('/register')}
                  className="btn-shimmer flex items-center gap-2.5 px-8 py-4 rounded-2xl font-black text-base text-black hover:scale-[1.03] transition-transform active:scale-[0.98]"
                  style={{ background: 'var(--accent)', boxShadow: '0 8px 32px rgba(200,255,0,0.25)' }}>
                  Create free account <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => navigate('/login')}
                  className="flex items-center gap-2 px-6 py-4 rounded-2xl text-white/60 hover:text-white font-semibold text-sm transition-colors border border-white/20 hover:border-white/40">
                  Sign in <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgb(var(--brand-600))' }}>
              <Zap className="w-3 h-3 text-white" fill="white" />
            </div>
            <span className="text-white/40 text-sm font-bold tracking-tight">Kingsmode</span>
          </div>
          <p className="label">Built for focus. Built for kings.</p>
          <div className="flex items-center gap-5">
            <button onClick={() => navigate('/login')} className="text-white/25 hover:text-white/60 text-xs font-medium transition-colors">Sign in</button>
            <button onClick={() => navigate('/register')} className="text-white/25 hover:text-white/60 text-xs font-medium transition-colors">Sign up</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
