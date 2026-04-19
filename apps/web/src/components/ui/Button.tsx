import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'ghost' | 'lime';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const Button = ({
  children, onClick, type = 'button', variant = 'primary',
  disabled, loading, className = '',
}: ButtonProps) => {
  const base = 'relative px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 overflow-hidden';

  const variants: Record<string, string> = {
    primary: 'bg-brand-600 hover:bg-brand-500 text-white glow-brand disabled:opacity-50',
    secondary: 'glass text-white hover:bg-white/10 disabled:opacity-50',
    ghost: 'text-brand-400 hover:text-white hover:bg-white/5 disabled:opacity-50',
    lime: 'text-dark-900 font-black btn-shimmer disabled:opacity-50',
  };

  const limeStyle = variant === 'lime'
    ? { background: 'var(--accent)', boxShadow: '0 0 32px rgba(200,255,0,0.25)' }
    : {};

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
      style={limeStyle}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : children}
    </motion.button>
  );
};
