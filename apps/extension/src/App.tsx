import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, ExternalLink, Settings2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Clock } from './components/Clock';
import { TodoList } from './components/TodoList';
import { Settings } from './components/Settings';

const BG_IMAGES: Record<string, string[]> = {
  formula1: [
    'https://images.unsplash.com/photo-1541348263662-e068662d82af?auto=format&fit=crop&w=1920&q=90',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1920&q=90',
    'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1920&q=90',
    'https://images.unsplash.com/photo-1580274455191-1c62238fa333?auto=format&fit=crop&w=1920&q=90',
  ],
  cars: [
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1920&q=90',
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1920&q=90',
    'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1920&q=90',
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1920&q=90',
  ],
  nature: [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=90',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1920&q=90',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=90',
    'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1920&q=90',
  ],
  myPhotos: [],
};

const DEFAULT_CATEGORIES = { formula1: true, cars: true, nature: true, myPhotos: false };

const QUOTES = [
  { text: "You don't rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "Either you run the day or the day runs you.", author: "Jim Rohn" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "The successful warrior is the average man with laser-like focus.", author: "Bruce Lee" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "Do the hard jobs first. The easy jobs will take care of themselves.", author: "Dale Carnegie" },
  { text: "The best place to find a helping hand is at the end of your own arm.", author: "Swedish Proverb" },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5)  return 'Still up?';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
};

const getDailyQuote = () => QUOTES[new Date().getDate() % QUOTES.length];

const getName = () => {
  try {
    const ext = localStorage.getItem('ff_ext_name');
    if (ext) return ext;
    const auth = localStorage.getItem('kingsmode-auth');
    if (auth) return JSON.parse(auth)?.state?.user?.name || '';
  } catch { /**/ }
  return '';
};

const loadCategories = (): Record<string, boolean> => {
  try {
    const saved = localStorage.getItem('ff_categories');
    if (saved) return { ...DEFAULT_CATEGORIES, ...JSON.parse(saved) };
  } catch { /**/ }
  return { ...DEFAULT_CATEGORIES };
};

const loadUserPhotos = (): string[] => {
  try {
    const saved = localStorage.getItem('ff_user_photos');
    if (saved) return JSON.parse(saved);
  } catch { /**/ }
  return [];
};

const getFocusMode = (): Promise<boolean> =>
  new Promise((res) => {
    if (typeof chrome === 'undefined' || !chrome.storage) { res(false); return; }
    chrome.storage.local.get('km_focus_mode', (r) => res(!!r.km_focus_mode));
  });

export default function App() {
  const [name, setName]               = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]     = useState('');
  const [goal, setGoal]               = useState('');
  const [goalSaved, setGoalSaved]     = useState('');
  const [bgLoaded, setBgLoaded]       = useState(false);
  const [showTasks, setShowTasks]     = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [focusMode, setFocusMode]     = useState(false);

  const blockedHost = new URLSearchParams(window.location.search).get('blocked');

  const [categories, setCategories] = useState<Record<string, boolean>>(loadCategories);
  const [userPhotos, setUserPhotos] = useState<string[]>(loadUserPhotos);

  const allImages = useMemo(() => {
    const imgs = Object.entries(categories)
      .filter(([, active]) => active)
      .flatMap(([key]) => key === 'myPhotos' ? userPhotos : (BG_IMAGES[key] || []))
      .filter(Boolean);
    return imgs.length > 0 ? imgs : BG_IMAGES.nature;
  }, [categories, userPhotos]);

  const [bgIndex, setBgIndex] = useState(() => new Date().getHours() % allImages.length);
  const bg = allImages[Math.min(bgIndex, allImages.length - 1)];
  const quote = getDailyQuote();

  useEffect(() => {
    const timer = setInterval(() => setBgIndex(new Date().getHours() % allImages.length), 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [allImages.length]);

  const prevBg = () => setBgIndex((i) => (i - 1 + allImages.length) % allImages.length);
  const nextBg = () => setBgIndex((i) => (i + 1) % allImages.length);

  useEffect(() => {
    const saved = getName();
    setName(saved);
    if (!saved) setEditingName(true);
    const savedGoal = localStorage.getItem('ff_daily_goal_' + new Date().toDateString()) || '';
    setGoalSaved(savedGoal);
    setGoal(savedGoal);
    const img = new Image();
    img.src = bg;
    img.onload = () => setBgLoaded(true);
    getFocusMode().then(setFocusMode);
  }, []);

  const toggleFocusMode = () => {
    const next = !focusMode;
    setFocusMode(next);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: next ? 'START_FOCUS_MODE' : 'STOP_FOCUS_MODE' });
    }
  };

  useEffect(() => { localStorage.setItem('ff_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('ff_user_photos', JSON.stringify(userPhotos)); }, [userPhotos]);

  const toggleCategory  = (key: string) => setCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  const addPhotos       = (photos: string[]) => { setUserPhotos((p) => [...p, ...photos]); setCategories((p) => ({ ...p, myPhotos: true })); };
  const deletePhoto     = (i: number) => setUserPhotos((p) => p.filter((_, idx) => idx !== i));

  const saveName = () => {
    if (!nameInput.trim()) return;
    localStorage.setItem('ff_ext_name', nameInput.trim());
    setName(nameInput.trim());
    setEditingName(false);
  };

  const saveGoal = (value: string) => {
    setGoalSaved(value);
    localStorage.setItem('ff_daily_goal_' + new Date().toDateString(), value);
  };

  return (
    <div className="w-screen h-screen relative overflow-hidden flex flex-col select-none">

      {/* ── Background ── */}
      <AnimatePresence>
        {bgLoaded ? (
          <motion.div
            key={bg}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.8, ease: 'easeOut' }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bg})` }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0a0a0e 0%, #1a0a2e 50%, #0a0a0e 100%)' }} />
        )}
      </AnimatePresence>

      {/* Gradient overlays */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.7) 100%)'
      }} />

      {/* ── Focus Blocked Overlay ── */}
      <AnimatePresence>
        {blockedHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center grain"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}
          >
            {/* Ghost text */}
            <p className="ghost-text absolute select-none" style={{ fontSize: 'clamp(6rem,18vw,16rem)' }}>
              BLOCKED
            </p>

            <div className="relative z-10 flex flex-col items-center gap-5 text-center px-8">
              {/* Lime accent bar */}
              <div className="w-12 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />
              <div>
                <p className="label mb-2">Focus mode is active</p>
                <p className="text-white font-black text-4xl tracking-tight mb-1">{blockedHost}</p>
                <p className="text-white/40 text-sm">is blocked. Stay in the zone.</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}
                onClick={toggleFocusMode}
                className="mt-2 px-6 py-2.5 rounded-xl text-sm font-black text-black btn-shimmer"
                style={{ background: 'var(--accent)' }}
              >
                End Focus Session
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Bar ── */}
      <div className="relative z-10 flex items-center justify-between px-7 pt-5">

        {/* Logo + focus badge */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-black text-xs"
            style={{ background: 'var(--accent)' }}>
            K
          </div>
          <span className="text-white font-black text-sm tracking-tight drop-shadow">Kingsmode</span>
          {focusMode && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(200,255,0,0.1)', border: '1px solid rgba(200,255,0,0.25)' }}>
              <div className="pulse-dot" />
              <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>Focus</span>
            </div>
          )}
        </div>

        {/* Nav controls */}
        <div className="flex items-center gap-1.5">
          {/* Focus toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleFocusMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={focusMode
              ? { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
              : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }
            }
          >
            {focusMode ? '⏹ End Focus' : '⚡ Focus'}
          </motion.button>

          {/* Tasks */}
          <button
            onClick={() => { setShowTasks((v) => !v); setShowSettings(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: showTasks ? 'rgba(200,255,0,0.12)' : 'rgba(255,255,255,0.08)',
              color: showTasks ? 'var(--accent)' : 'rgba(255,255,255,0.7)',
              border: showTasks ? '1px solid rgba(200,255,0,0.25)' : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Tasks
          </button>

          {/* Open app */}
          <a
            href="http://localhost:3000" target="_blank" rel="noreferrer"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
            title="Open Kingsmode"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Settings */}
          <button
            onClick={() => { setShowSettings((v) => !v); setShowTasks(false); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: showSettings ? 'rgba(200,255,0,0.12)' : 'rgba(255,255,255,0.08)',
              border: showSettings ? '1px solid rgba(200,255,0,0.25)' : '1px solid rgba(255,255,255,0.1)',
              color: showSettings ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
            }}
            title="Settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── CENTER ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-5">

        <Clock />

        {/* Greeting / name input */}
        {editingName ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
            <p className="label">What should I call you?</p>
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                placeholder="Your name"
                className="bg-transparent text-white text-center placeholder:text-white/25 text-xl font-black outline-none pb-1 w-52 tracking-tight"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }}
              />
              <button onClick={saveName}
                className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-black text-xs"
                style={{ background: 'var(--accent)' }}>
                →
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col items-center gap-4"
          >
            <h1 className="text-white font-black tracking-tight text-center drop-shadow-lg"
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', letterSpacing: '-0.03em', textShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
              {getGreeting()}{name ? `, ${name}` : ''}.
            </h1>

            {/* Daily goal */}
            <div className="flex flex-col items-center gap-1.5">
              <p className="label">Today's main goal</p>
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onBlur={() => saveGoal(goal)}
                onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur())}
                placeholder="What must get done today?"
                className="bg-transparent text-white text-center placeholder:text-white/25 text-base font-semibold outline-none pb-1.5 w-96 transition-all"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}
                onFocus={(e) => (e.currentTarget.style.borderBottomColor = 'rgba(200,255,0,0.6)')}
                onBlurCapture={(e) => (e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,0.2)')}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* ── BOTTOM ── */}
      <div className="relative z-10 flex items-end justify-between px-7 pb-6">

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="max-w-sm flex flex-col gap-2"
        >
          <div className="w-6 h-px rounded-full" style={{ background: 'var(--accent)' }} />
          <p className="text-white/60 text-sm leading-relaxed font-medium drop-shadow">
            &ldquo;{quote.text}&rdquo;
          </p>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest">— {quote.author}</p>
        </motion.div>

        {/* Right controls */}
        <div className="flex flex-col items-end gap-3">
          {/* Bg dots */}
          <div className="flex gap-1.5 items-center">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setBgIndex(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === bgIndex ? '1.5rem' : '0.375rem',
                  height: '0.375rem',
                  background: i === bgIndex ? 'var(--accent)' : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>

          {/* Edit name */}
          <button
            onClick={() => { setEditingName(true); setNameInput(name); }}
            className="text-xs font-semibold transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >
            ✏️ {name || 'Set name'}
          </button>
        </div>
      </div>

      {/* ── Image arrows ── */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-between px-3 pointer-events-none">
        {[{ fn: prevBg, icon: <ChevronLeft className="w-5 h-5" /> }, { fn: nextBg, icon: <ChevronRight className="w-5 h-5" /> }].map(({ fn, icon }, idx) => (
          <motion.button
            key={idx}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={fn}
            className="pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all"
            style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}
          >
            {icon}
          </motion.button>
        ))}
      </div>

      {/* ── Tasks Panel ── */}
      <AnimatePresence>
        {showTasks && (
          <motion.div
            initial={{ opacity: 0, x: 340 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 340 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="absolute right-0 top-0 bottom-0 w-80 z-20 flex flex-col grain"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(28px)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Lime top stripe */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />

            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <p className="text-white font-black tracking-tight">Today's Tasks</p>
                <p className="label mt-0.5">Stay on mission</p>
              </div>
              <button onClick={() => setShowTasks(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-4 pb-5 flex-1 overflow-y-auto">
              <TodoList />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Settings Panel ── */}
      <AnimatePresence>
        {showSettings && (
          <Settings
            onClose={() => setShowSettings(false)}
            categories={categories}
            onToggleCategory={toggleCategory}
            userPhotos={userPhotos}
            onAddPhotos={addPhotos}
            onDeletePhoto={deletePhoto}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
