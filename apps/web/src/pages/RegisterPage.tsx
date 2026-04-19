import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/ui/Input';
import { QuotePanel } from '../components/ui/QuotePanel';
import { SocialLoginButtons } from '../components/ui/SocialLoginButtons';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
}

const PERKS = [
  { icon: '⚡', label: 'Earn XP' },
  { icon: '🔥', label: 'Build streaks' },
  { icon: '🎯', label: 'Track focus' },
];

export const RegisterPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.register(data);
      const { user, token } = res.data.data;
      setAuth(user, token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Left — Quote Panel */}
      <div className="lg:w-[45%] flex-shrink-0">
        <QuotePanel />
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden grain">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/3 w-72 h-72 rounded-full blur-3xl"
            style={{ background: 'rgba(124,58,237,0.12)' }} />
          <div className="absolute bottom-1/4 left-1/4 w-48 h-48 rounded-full blur-3xl"
            style={{ background: 'rgba(200,255,0,0.05)' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm relative z-10"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-dark-900 text-sm"
              style={{ background: 'var(--accent)' }}>
              K
            </div>
            <span className="text-white font-black text-lg tracking-tight">Kingsmode</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <p className="label mb-3">Create your account</p>
            <h1 className="text-4xl font-black text-white tracking-tight leading-none mb-2">
              Start your<br />
              <span style={{
                background: 'linear-gradient(135deg, rgb(var(--brand-400)), rgb(var(--brand-300)))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>reign today.</span>
            </h1>
            <p className="text-sm mt-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Free forever. No credit card needed.
            </p>
          </div>

          {/* Perks */}
          <div className="flex gap-2 mb-7">
            {PERKS.map((p) => (
              <div key={p.label} className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-base">{p.icon}</span>
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{p.label}</span>
              </div>
            ))}
          </div>

          <SocialLoginButtons mode="register" />

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Your Name"
              type="text"
              placeholder="John Doe"
              icon={<User className="w-4 h-4" />}
              error={errors.name?.message}
              {...register('name', { required: 'Name is required' })}
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' },
              })}
            />

            <Input
              label="Password"
              type="password"
              placeholder="At least 6 characters"
              icon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Minimum 6 characters' },
              })}
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-400 text-center bg-red-500/10 px-4 py-2.5 rounded-xl border border-red-500/20"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02 }}
              className="relative w-full py-3.5 rounded-xl font-black text-sm text-dark-900 btn-shimmer flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
              style={{ background: 'var(--accent)', boxShadow: '0 0 40px rgba(200,255,0,0.2)' }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
              ) : (
                <>Create Account — It's Free <ArrowRight className="w-4 h-4" /></>
              )}
            </motion.button>
          </form>

          <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Already have an account?{' '}
              <Link to="/login" className="font-bold transition-colors"
                style={{ color: 'rgb(var(--brand-400))' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgb(var(--brand-300))')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgb(var(--brand-400))')}>
                Sign in →
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
