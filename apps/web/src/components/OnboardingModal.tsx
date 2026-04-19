import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, Timer, ArrowRight, X } from 'lucide-react';

const STEPS = [
  {
    icon: '👑',
    title: "Welcome to Kingsmode",
    subtitle: "Your personal focus command centre.",
    body: "Kingsmode helps you work in deep focus sessions, track habits, manage tasks, and level up your productivity — all in one place.",
    cta: "Let's go →",
  },
  {
    icon: '⏱️',
    title: "The Pomodoro Method",
    subtitle: "Work smarter, not harder.",
    body: "Focus for 25 minutes, then take a 5-minute break. After 4 sessions, earn a long break. Each completed session earns you XP and builds your streak.",
    cta: "Got it →",
  },
  {
    icon: '✅',
    title: "Tasks & Reminders",
    subtitle: "Never miss what matters.",
    body: "Add tasks with due dates and priorities. Set reminders with browser notifications. Track habits daily to build unstoppable consistency.",
    cta: "One more →",
  },
  {
    icon: '🚀',
    title: "You're all set!",
    subtitle: "Start your first session.",
    body: "Hit the ▶ Play button on the Focus Timer to start your first Pomodoro. Your journey to peak focus begins now.",
    cta: "Start focusing",
  },
];

const ONBOARDING_KEY = 'ff_onboarded';

export const useOnboarding = () => {
  const done = typeof window !== 'undefined' && !!localStorage.getItem(ONBOARDING_KEY);
  return !done;
};

export const OnboardingModal = ({ onDone }: { onDone: () => void }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  const advance = () => {
    if (isLast) {
      localStorage.setItem(ONBOARDING_KEY, '1');
      onDone();
    } else {
      setStep((s) => s + 1);
    }
  };

  const skip = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.97 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="relative w-full max-w-md rounded-3xl p-8 text-center"
          style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Skip */}
          {!isLast && (
            <button onClick={skip}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/20 hover:text-white/60 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-8">
            {STEPS.map((_, i) => (
              <div key={i} className="rounded-full transition-all"
                style={{
                  width:      i === step ? 20 : 6,
                  height:     6,
                  background: i === step ? 'rgb(var(--brand-500))' : i < step ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.1)',
                }} />
            ))}
          </div>

          {/* Icon */}
          <div className="text-6xl mb-6 leading-none">{current.icon}</div>

          {/* Text */}
          <h2 className="text-white text-2xl font-bold tracking-tight mb-2">{current.title}</h2>
          <p className="text-brand-400 text-sm font-medium mb-4">{current.subtitle}</p>
          <p className="text-white/40 text-sm leading-relaxed mb-8">{current.body}</p>

          {/* Feature pills on last step */}
          {isLast && (
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {[
                { icon: <Timer className="w-3 h-3" />, label: 'Pomodoro Timer' },
                { icon: <CheckCircle2 className="w-3 h-3" />, label: 'Task Tracker' },
                { icon: <Zap className="w-3 h-3" />, label: 'XP & Levels' },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-white/50"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {f.icon} {f.label}
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <motion.button
            onClick={advance}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-500)))' }}
          >
            {current.cta}
            {!isLast && <ArrowRight className="w-4 h-4" />}
          </motion.button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
