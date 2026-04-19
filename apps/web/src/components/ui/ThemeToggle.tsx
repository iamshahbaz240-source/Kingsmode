import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useThemeStore();
  const isGolden = theme === 'golden';

  return (
    <motion.button
      onClick={toggleTheme}
      whileTap={{ scale: 0.92 }}
      title={isGolden ? 'Switch to Dark' : 'Switch to Golden'}
      className="relative w-14 h-7 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden flex items-center px-1"
    >
      {/* Track gradient */}
      <motion.div
        animate={{ opacity: isGolden ? 1 : 0 }}
        className="absolute inset-0 bg-gradient-to-r from-amber-900/40 to-amber-600/20"
      />

      {/* Sliding thumb */}
      <motion.div
        animate={{ x: isGolden ? 28 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="relative z-10 w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-lg"
        style={{
          background: isGolden
            ? 'linear-gradient(135deg, #fbbf24, #d97706)'
            : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
          boxShadow: isGolden
            ? '0 0 8px rgba(251,191,36,0.6)'
            : '0 0 8px rgba(139,92,246,0.6)',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={theme}
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            {isGolden ? '☀️' : '🌙'}
          </motion.span>
        </AnimatePresence>
      </motion.div>
    </motion.button>
  );
};
