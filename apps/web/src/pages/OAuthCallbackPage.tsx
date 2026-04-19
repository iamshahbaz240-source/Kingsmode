import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

export const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const setAuth  = useAuthStore((s) => s.setAuth);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    const error  = params.get('error');

    if (error || !token) {
      const msg =
        error === 'access_denied' ? 'Sign-in was cancelled.'
        : error === 'oauth_failed' ? 'Authentication failed. Please try again.'
        : 'Something went wrong.';
      setErrorMsg(msg);
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    // Fetch full user profile with the token
    authApi.me(token)
      .then((res) => {
        const user = res.data.data?.user ?? res.data.user;
        setAuth(user, token);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        setErrorMsg('Failed to load profile. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
      });
  }, []);

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center grain">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'rgba(124,58,237,0.12)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex flex-col items-center gap-6 text-center px-6"
      >
        {/* Logo */}
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-dark-900 text-lg"
          style={{ background: 'var(--accent)' }}>
          K
        </div>

        {errorMsg ? (
          <>
            <p className="text-red-400 font-semibold">{errorMsg}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Redirecting to login…</p>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-white/10 rounded-full animate-spin"
                style={{ borderTopColor: 'var(--accent)' }} />
              <p className="text-white font-black text-lg tracking-tight">Signing you in…</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Just a moment</p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
