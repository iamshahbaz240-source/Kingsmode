import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="label">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-3.5 rounded-xl text-sm
            bg-white/[0.04] border
            text-white placeholder:text-white/25
            focus:outline-none focus:bg-white/[0.06]
            transition-all duration-200
            ${icon ? 'pl-10' : ''}
            ${error
              ? 'border-red-500/50 focus:border-red-500/70'
              : 'border-white/[0.08] focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30'
            }
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
    </div>
  )
);

Input.displayName = 'Input';
