import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { quotes } from '../../data/quotes';

const stats = [
  { value: '10K+', label: 'Sessions' },
  { value: '2.4M', label: 'Min Focused' },
  { value: '98%', label: 'Love It' },
];

export const QuotePanel = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % quotes.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden lg:flex flex-col h-full relative overflow-hidden grain"
      style={{ background: 'rgb(var(--dark-800))' }}>

      {/* Purple radial glow */}
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(124,58,237,0.18)' }} />
      {/* Lime corner accent */}
      <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(200,255,0,0.07)' }} />

      {/* Top lime stripe */}
      <div className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />

      <div className="relative z-10 flex flex-col h-full p-10">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-dark-900 text-sm"
            style={{ background: 'var(--accent)' }}>
            K
          </div>
          <span className="text-white font-black text-xl tracking-tight">Kingsmode</span>
        </div>

        {/* Big ghost letters */}
        <div className="mt-auto">
          <p className="text-[9rem] font-black leading-none select-none tracking-tighter mb-4 pointer-events-none"
            style={{ color: 'rgba(255,255,255,0.03)' }}>
            KM
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-4"
            >
              {/* Lime accent bar */}
              <div className="w-10 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />

              <p className="text-white font-black text-2xl leading-snug tracking-tight">
                &ldquo;{quotes[index].text}&rdquo;
              </p>

              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                — {quotes[index].author}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Dot nav */}
          <div className="flex gap-1.5 mt-7">
            {quotes.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className="h-px rounded-full transition-all duration-500"
                style={{
                  width: i === index ? '2rem' : '0.5rem',
                  background: i === index ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex gap-8 mt-10 pt-6"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-black text-white tracking-tight">{stat.value}</p>
              <p className="text-xs font-bold uppercase tracking-widest mt-0.5"
                style={{ color: 'rgba(255,255,255,0.3)' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
