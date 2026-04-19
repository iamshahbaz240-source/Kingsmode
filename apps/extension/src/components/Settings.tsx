import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Trash2, Zap, LogOut, Check, AlertCircle } from 'lucide-react';
import { extApi } from '../services/api';

interface Props {
  onClose: () => void;
  categories: Record<string, boolean>;
  onToggleCategory: (key: string) => void;
  userPhotos: string[];
  onAddPhotos: (photos: string[]) => void;
  onDeletePhoto: (index: number) => void;
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  formula1: { label: 'Formula 1',   emoji: '🏎️' },
  cars:     { label: 'Cars',        emoji: '🚗' },
  nature:   { label: 'Nature',      emoji: '🌿' },
  myPhotos: { label: 'My Photos',   emoji: '🖼️' },
};

export const Settings = ({
  onClose, categories, onToggleCategory, userPhotos, onAddPhotos, onDeletePhoto,
}: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Kingsmode account sync ─────────────────────────────
  const [connected, setConnected] = useState(false);
  const [userName,  setUserName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [loginErr,  setLoginErr]  = useState('');
  const [logging,   setLogging]   = useState(false);

  useEffect(() => {
    extApi.getToken().then((t) => {
      if (t) setConnected(true);
    });
    // Try to pull name from web app's Zustand persist key
    try {
      const auth = localStorage.getItem('kingsmode-auth');
      if (auth) {
        const name = JSON.parse(auth)?.state?.user?.name;
        if (name) setUserName(name);
      }
    } catch { /**/ }
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setLogging(true); setLoginErr('');
    try {
      const user = await extApi.login(email.trim(), password);
      setUserName(user?.name ?? '');
      setConnected(true);
      setEmail(''); setPassword('');
    } catch (e: any) {
      setLoginErr(e.message ?? 'Login failed');
    } finally {
      setLogging(false);
    }
  };

  const handleLogout = async () => {
    await extApi.logout();
    setConnected(false);
    setUserName('');
  };

  const readFiles = (files: FileList) => {
    setUploading(true);
    const readers: Promise<string>[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          })
      );

    Promise.all(readers).then((results) => {
      onAddPhotos(results);
      setUploading(false);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files) readFiles(e.dataTransfer.files);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 340 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 340 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="absolute right-0 top-0 bottom-0 w-80 z-30 flex flex-col grain"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(28px)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Lime top stripe */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <h2 className="text-white font-black tracking-tight">Settings</h2>
          <p className="label mt-0.5">Customize your Kingsmode</p>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'white')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Background categories */}
        <div>
          <p className="label mb-3">Backgrounds</p>
          <div className="space-y-1.5">
            {Object.entries(CATEGORY_LABELS).map(([key, { label, emoji }]) => (
              <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{emoji}</span>
                  <span className="text-white/80 text-sm font-semibold">{label}</span>
                  {key === 'myPhotos' && userPhotos.length > 0 && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: 'rgba(200,255,0,0.1)', color: 'var(--accent)' }}>
                      {userPhotos.length}
                    </span>
                  )}
                </div>
                <button onClick={() => onToggleCategory(key)}
                  className="w-10 h-5 rounded-full relative transition-all duration-300"
                  style={{ background: categories[key] ? 'var(--accent)' : 'rgba(255,255,255,0.12)' }}>
                  <motion.div
                    animate={{ x: categories[key] ? 20 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="absolute top-0.5 w-4 h-4 rounded-full shadow"
                    style={{ background: categories[key] ? '#000' : '#fff' }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Upload photos */}
        <div>
          <p className="label mb-3">Your Photos</p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all"
            style={{
              borderColor: dragging ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
              background: dragging ? 'rgba(200,255,0,0.05)' : 'transparent',
            }}
          >
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => e.target.files && readFiles(e.target.files)} />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/20 rounded-full animate-spin"
                  style={{ borderTopColor: 'var(--accent)' }} />
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Uploading…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <Upload className="w-5 h-5 mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Drop photos here</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>or click to browse</p>
              </div>
            )}
          </div>

          {userPhotos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <AnimatePresence>
                {userPhotos.map((photo, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                    className="relative group aspect-square rounded-lg overflow-hidden">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.6)' }}>
                      <button onClick={() => onDeletePhoto(i)}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: '#ef4444' }}>
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Kingsmode account sync */}
        <div>
          <p className="label mb-3">Kingsmode Account</p>
          <AnimatePresence mode="wait">
            {connected ? (
              <motion.div key="connected" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-4 rounded-xl space-y-3"
                style={{ background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.2)' }}>
                <div className="flex items-center gap-2">
                  <div className="pulse-dot" />
                  <span className="text-xs font-black" style={{ color: 'var(--accent)' }}>Synced</span>
                </div>
                {userName && (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                      style={{ background: 'var(--accent)', color: '#000' }}>
                      {userName[0].toUpperCase()}
                    </div>
                    <span className="text-white/70 text-sm font-semibold">{userName}</span>
                  </div>
                )}
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Tasks sync automatically.</p>
                <button onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
                  <LogOut className="w-3 h-3" /> Disconnect
                </button>
              </motion.div>
            ) : (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2.5">
                <div className="p-3 rounded-xl space-y-2"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} fill="currentColor" />
                    <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>Connect to sync tasks</span>
                  </div>
                  <input value={email} onChange={(e) => setEmail(e.target.value)}
                    type="email" placeholder="Email"
                    className="w-full rounded-lg px-3 py-2 text-white text-xs outline-none placeholder:text-white/20 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <input value={password} onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    type="password" placeholder="Password"
                    className="w-full rounded-lg px-3 py-2 text-white text-xs outline-none placeholder:text-white/20 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  {loginErr && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#f87171' }}>
                      <AlertCircle className="w-3 h-3 shrink-0" />{loginErr}
                    </div>
                  )}
                  <button onClick={handleLogin} disabled={logging || !email || !password}
                    className="w-full py-2 rounded-lg text-xs font-black text-black btn-shimmer disabled:opacity-40 flex items-center justify-center gap-1.5"
                    style={{ background: 'var(--accent)' }}>
                    {logging
                      ? <><div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Connecting…</>
                      : <><Check className="w-3 h-3" /> Connect</>
                    }
                  </button>
                </div>
                <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Use your Kingsmode credentials
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
