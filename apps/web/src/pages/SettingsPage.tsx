import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, Lock, Trash2, Check, AlertTriangle, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

// ── Section wrapper ────────────────────────────────────────
const Section = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative rounded-2xl p-6 space-y-5 overflow-hidden"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
  >
    <div className="absolute top-0 left-6 w-8 h-px" style={{ background: 'var(--accent)' }} />
    <div>
      <p className="text-white font-black tracking-tight">{title}</p>
      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{subtitle}</p>
    </div>
    {children}
  </motion.div>
);

// ── Field ──────────────────────────────────────────────────
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="label">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full rounded-xl px-4 py-3 text-white text-sm outline-none transition-all duration-200 placeholder:text-white/20"
  + " focus:ring-1 focus:ring-brand-500/40 focus:border-brand-500/50";

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
};

// ── Status message ─────────────────────────────────────────
const StatusMsg = ({ type, msg }: { type: 'success' | 'error'; msg: string }) => (
  <AnimatePresence>
    {msg && (
      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        className="text-xs font-bold flex items-center gap-1.5"
        style={{ color: type === 'success' ? '#c8ff00' : '#f87171' }}>
        {type === 'success' ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
        {msg}
      </motion.p>
    )}
  </AnimatePresence>
);

const FOCUS_GOAL_KEY = 'ff_focus_goal';

export const SettingsPage = () => {
  const navigate  = useNavigate();
  const { user, updateUser, logout } = useAuthStore();

  const [name,  setName]  = useState(user?.name  ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [curPw,  setCurPw]  = useState('');
  const [newPw,  setNewPw]  = useState('');
  const [confPw, setConfPw] = useState('');
  const [pwMsg,  setPwMsg]  = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const [focusGoal, setFocusGoal] = useState(() => parseInt(localStorage.getItem(FOCUS_GOAL_KEY) || '120'));
  const [goalSaved, setGoalSaved] = useState(false);

  const [deletePw,    setDeletePw]    = useState('');
  const [deleteMsg,   setDeleteMsg]   = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  const saveProfile = async () => {
    if (!name.trim()) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const r = await authApi.updateProfile({ name: name.trim(), email: email.trim() || undefined });
      updateUser(r.data.user);
      setProfileMsg({ type: 'success', text: 'Profile updated!' });
    } catch (e: any) {
      setProfileMsg({ type: 'error', text: e?.response?.data?.error ?? 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!curPw || !newPw || !confPw) return;
    if (newPw !== confPw) { setPwMsg({ type: 'error', text: 'New passwords do not match' }); return; }
    if (newPw.length < 6) { setPwMsg({ type: 'error', text: 'Password must be at least 6 characters' }); return; }
    setSavingPw(true);
    setPwMsg(null);
    try {
      await authApi.changePassword({ currentPassword: curPw, newPassword: newPw });
      setPwMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurPw(''); setNewPw(''); setConfPw('');
    } catch (e: any) {
      setPwMsg({ type: 'error', text: e?.response?.data?.error ?? 'Failed to change password' });
    } finally {
      setSavingPw(false);
    }
  };

  const saveFocusGoal = (val: number) => {
    const clamped = Math.min(Math.max(val, 10), 480);
    setFocusGoal(clamped);
    localStorage.setItem(FOCUS_GOAL_KEY, String(clamped));
    setGoalSaved(true);
    setTimeout(() => setGoalSaved(false), 1500);
  };

  const handleDeleteAccount = async () => {
    if (!deletePw) return;
    setDeleting(true);
    setDeleteMsg(null);
    try {
      await authApi.deleteAccount({ password: deletePw });
      logout();
    } catch (e: any) {
      setDeleteMsg({ type: 'error', text: e?.response?.data?.error ?? 'Failed to delete account' });
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 grain">
      {/* Top glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.07) 0%, transparent 70%)' }} />

      {/* Nav */}
      <div className="sticky top-0 z-20 px-6 py-4"
        style={{ background: 'rgba(6,6,8,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Lime top line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, var(--accent), transparent 40%)' }} />
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-white font-black tracking-tight">Settings</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Account & preferences</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-4 relative z-10">

        {/* ── Profile ── */}
        <Section title="Profile" subtitle="Update your name and email address">
          <div className="flex items-center gap-4 pb-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 text-dark-900"
              style={{ background: 'var(--accent)' }}>
              {(user?.name ?? 'U')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-white font-black tracking-tight">{user?.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{user?.email}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Level {user?.level} · {user?.xp} XP total
              </p>
            </div>
          </div>

          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your name" className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)}
              type="email" placeholder="your@email.com" className={inputCls} style={inputStyle} />
          </Field>

          {profileMsg && <StatusMsg type={profileMsg.type} msg={profileMsg.text} />}

          <motion.button onClick={saveProfile} disabled={savingProfile || !name.trim()}
            whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-dark-900 disabled:opacity-40 btn-shimmer"
            style={{ background: 'var(--accent)' }}>
            <User className="w-3.5 h-3.5" />
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </motion.button>
        </Section>

        {/* ── Focus Goal ── */}
        <Section title="Daily Focus Goal" subtitle="Set how many minutes you aim to focus each day">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(var(--brand-600),0.15)', border: '1px solid rgba(var(--brand-600),0.2)' }}>
              <Target className="w-5 h-5" style={{ color: 'rgb(var(--brand-400))' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <button onClick={() => saveFocusGoal(focusGoal - 10)}
                  className="w-9 h-9 rounded-xl font-black text-white text-xl flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>−</button>
                <div className="flex-1 text-center">
                  <p className="text-white text-2xl font-black tabular-nums tracking-tight">{focusGoal}m</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {Math.floor(focusGoal / 60)}h {focusGoal % 60}m per day
                  </p>
                </div>
                <button onClick={() => saveFocusGoal(focusGoal + 10)}
                  className="w-9 h-9 rounded-xl font-black text-white text-xl flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>+</button>
              </div>
              <input type="range" min={10} max={480} step={10} value={focusGoal}
                onChange={(e) => saveFocusGoal(Number(e.target.value))}
                className="w-full mt-3 cursor-pointer" style={{ accentColor: 'var(--accent)' }} />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <span>10m</span><span>2h</span><span>4h</span><span>8h</span>
              </div>
            </div>
          </div>
          {goalSaved && <StatusMsg type="success" msg="Goal saved!" />}
        </Section>

        {/* ── Password ── */}
        <Section title="Change Password" subtitle="Make sure it's at least 6 characters">
          <Field label="Current password">
            <input value={curPw} onChange={(e) => setCurPw(e.target.value)}
              type="password" placeholder="••••••••" className={inputCls} style={inputStyle} />
          </Field>
          <Field label="New password">
            <input value={newPw} onChange={(e) => setNewPw(e.target.value)}
              type="password" placeholder="••••••••" className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Confirm new password">
            <input value={confPw} onChange={(e) => setConfPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && savePassword()}
              type="password" placeholder="••••••••" className={inputCls} style={inputStyle} />
          </Field>

          {pwMsg && <StatusMsg type={pwMsg.type} msg={pwMsg.text} />}

          <motion.button onClick={savePassword} disabled={savingPw || !curPw || !newPw || !confPw}
            whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Lock className="w-3.5 h-3.5" />
            {savingPw ? 'Updating…' : 'Update Password'}
          </motion.button>
        </Section>

        {/* ── Danger Zone ── */}
        <Section title="Danger Zone" subtitle="Permanent actions that cannot be undone">
          <AnimatePresence mode="wait">
            {!confirmOpen ? (
              <motion.button key="open" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={() => setConfirmOpen(true)}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                <Trash2 className="w-3.5 h-3.5" />
                Delete Account
              </motion.button>
            ) : (
              <motion.div key="confirm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-3 p-4 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
                <p className="text-sm font-bold" style={{ color: '#f87171' }}>
                  ⚠️ This permanently deletes your account and all data.
                </p>
                <Field label="Enter your password to confirm">
                  <input value={deletePw} onChange={(e) => setDeletePw(e.target.value)}
                    type="password" placeholder="••••••••" className={inputCls}
                    style={{ ...inputStyle, borderColor: 'rgba(239,68,68,0.3)' }} />
                </Field>
                {deleteMsg && <StatusMsg type={deleteMsg.type} msg={deleteMsg.text} />}
                <div className="flex gap-2">
                  <button onClick={handleDeleteAccount} disabled={deleting || !deletePw}
                    className="flex-1 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: '#ef4444' }}>
                    {deleting ? 'Deleting…' : 'Yes, delete my account'}
                  </button>
                  <button onClick={() => { setConfirmOpen(false); setDeletePw(''); setDeleteMsg(null); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Section>

      </div>
    </div>
  );
};
