import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const pad = (n: number) => String(n).padStart(2, '0');

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const Clock = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const h    = now.getHours() % 12 || 12;
  const m    = now.getMinutes();
  const s    = now.getSeconds();
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  const day  = DAYS[now.getDay()];
  const date = `${day}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-2"
    >
      {/* Date */}
      <p className="label" style={{ letterSpacing: '0.22em' }}>{date}</p>

      {/* Time */}
      <div className="flex items-end gap-2 leading-none">
        <span
          className="text-white font-black tracking-tight drop-shadow-2xl tabular-nums"
          style={{ fontSize: 'clamp(5rem, 13vw, 9rem)', lineHeight: 1, letterSpacing: '-0.04em', textShadow: '0 8px 48px rgba(0,0,0,0.5)' }}
        >
          {h}:{pad(m)}
        </span>
        <div className="flex flex-col items-start mb-3 gap-1">
          {/* Seconds in lime */}
          <span className="font-black tabular-nums" style={{ fontSize: '1.6rem', color: 'var(--accent)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {pad(s)}
          </span>
          <span className="text-white/40 font-bold text-sm">{ampm}</span>
        </div>
      </div>
    </motion.div>
  );
};
