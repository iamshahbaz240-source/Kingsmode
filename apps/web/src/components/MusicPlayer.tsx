import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VolumeX, Play, Pause, ChevronDown, ChevronUp, Music2, Wind, ExternalLink } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// AMBIENT TAB
// ─────────────────────────────────────────────────────────────
interface SoundDef {
  id: string;
  label: string;
  emoji: string;
  color: string;
  type: 'white' | 'brown' | 'pink' | 'rain' | 'ocean' | 'fire' | 'cafe';
}

const SOUNDS: SoundDef[] = [
  { id: 'rain',  label: 'Rain',        emoji: '🌧️', color: '#60a5fa', type: 'rain'  },
  { id: 'ocean', label: 'Ocean',       emoji: '🌊', color: '#34d399', type: 'ocean' },
  { id: 'fire',  label: 'Fireplace',   emoji: '🔥', color: '#f97316', type: 'fire'  },
  { id: 'cafe',  label: 'Café',        emoji: '☕', color: '#a78bfa', type: 'cafe'  },
  { id: 'brown', label: 'Brown Noise', emoji: '🟤', color: '#d97706', type: 'brown' },
  { id: 'white', label: 'White Noise', emoji: '⬜', color: '#94a3b8', type: 'white' },
];

class SoundEngine {
  ctx: AudioContext;
  masterGain: GainNode;
  nodes: Map<string, { source: AudioBufferSourceNode | OscillatorNode; gain: GainNode; extra?: AudioNode[] }>;

  constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.nodes = new Map();
  }

  private makeNoiseBuffer(type: 'white' | 'brown' | 'pink'): AudioBuffer {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(2, sr * 3, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      if (type === 'white') {
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } else if (type === 'brown') {
        let last = 0;
        for (let i = 0; i < d.length; i++) {
          const w = Math.random() * 2 - 1;
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        }
      } else {
        let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
        for (let i = 0; i < d.length; i++) {
          const w = Math.random() * 2 - 1;
          b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
          b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
          b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
          d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11;
          b6=w*0.115926;
        }
      }
    }
    return buf;
  }

  private makeSource(buf: AudioBuffer): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true; return src;
  }

  start(id: string, type: SoundDef['type'], vol: number) {
    if (this.nodes.has(id)) return;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    gain.connect(this.masterGain);
    const extra: AudioNode[] = [];

    if (type === 'white') {
      const src = this.makeSource(this.makeNoiseBuffer('white'));
      src.connect(gain); src.start();
      this.nodes.set(id, { source: src, gain, extra });
    } else if (type === 'brown') {
      const src = this.makeSource(this.makeNoiseBuffer('brown'));
      src.connect(gain); src.start();
      this.nodes.set(id, { source: src, gain, extra });
    } else if (type === 'pink') {
      const src = this.makeSource(this.makeNoiseBuffer('pink'));
      src.connect(gain); src.start();
      this.nodes.set(id, { source: src, gain, extra });
    } else if (type === 'rain') {
      const src = this.makeSource(this.makeNoiseBuffer('white'));
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.8;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 300;
      src.connect(hp); hp.connect(lp); lp.connect(gain); src.start();
      extra.push(lp, hp);
      this.nodes.set(id, { source: src, gain, extra });
    } else if (type === 'ocean') {
      const src = this.makeSource(this.makeNoiseBuffer('brown'));
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 500;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.15;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.4;
      lfo.connect(lfoGain); lfoGain.connect(lp.frequency); lfo.start();
      src.connect(lp); lp.connect(gain); src.start();
      extra.push(lp, lfo, lfoGain);
      this.nodes.set(id, { source: src, gain, extra });
    } else if (type === 'fire') {
      const src = this.makeSource(this.makeNoiseBuffer('brown'));
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 800; lp.Q.value = 1.2;
      const lfo = this.ctx.createOscillator();
      lfo.type = 'triangle'; lfo.frequency.value = 0.6;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 200;
      lfo.connect(lfoGain); lfoGain.connect(lp.frequency); lfo.start();
      src.connect(lp); lp.connect(gain); src.start();
      extra.push(lp, lfo, lfoGain);
      this.nodes.set(id, { source: src, gain, extra });
    } else if (type === 'cafe') {
      const src = this.makeSource(this.makeNoiseBuffer('pink'));
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.5;
      src.connect(bp); bp.connect(gain); src.start();
      extra.push(bp);
      this.nodes.set(id, { source: src, gain, extra });
    }
  }

  stop(id: string) {
    const node = this.nodes.get(id);
    if (!node) return;
    try { if ('stop' in node.source) node.source.stop(); } catch { /**/ }
    node.gain.disconnect();
    this.nodes.delete(id);
  }

  setVolume(id: string, vol: number) {
    const node = this.nodes.get(id);
    if (node) node.gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
  }

  setMasterVolume(vol: number) {
    this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
  }

  resume()  { if (this.ctx.state === 'suspended') this.ctx.resume(); }
  suspend() { if (this.ctx.state === 'running')   this.ctx.suspend(); }
  destroy() { this.ctx.close(); }
}

// ─────────────────────────────────────────────────────────────
// SPOTIFY TAB
// ─────────────────────────────────────────────────────────────
interface SpotifyPreset {
  id: string;
  label: string;
  emoji: string;
  spotifyId: string;
  type: 'playlist';
}

const SPOTIFY_PRESETS: SpotifyPreset[] = [
  { id: 'lofi',       label: 'Lo-Fi Beats',     emoji: '🎧', spotifyId: '37i9dQZF1DX8Uebhn9wzrS', type: 'playlist' },
  { id: 'deepfocus',  label: 'Deep Focus',       emoji: '🧠', spotifyId: '37i9dQZF1DWZeKCadgRdKQ', type: 'playlist' },
  { id: 'brainfood',  label: 'Brain Food',       emoji: '⚡', spotifyId: '37i9dQZF1DWXLeA8Omikj7', type: 'playlist' },
  { id: 'afternoon',  label: 'Productive Morning',emoji: '☀️', spotifyId: '37i9dQZF1DX9sIqqvKsjEK', type: 'playlist' },
  { id: 'focusflow',  label: 'Focus Flow',       emoji: '🌊', spotifyId: '37i9dQZF1DWZ7eJRBxKzdO', type: 'playlist' },
  { id: 'classical',  label: 'Classical Focus',  emoji: '🎻', spotifyId: '37i9dQZF1DWV0gynK7G6pD', type: 'playlist' },
];

const parseSpotifyUrl = (url: string): { type: string; id: string } | null => {
  try {
    // Accept both full URLs and spotify:playlist:ID URIs
    const uriMatch = url.match(/spotify:(track|album|playlist|artist):([A-Za-z0-9]+)/);
    if (uriMatch) return { type: uriMatch[1], id: uriMatch[2] };
    const urlMatch = url.match(/open\.spotify\.com\/(track|album|playlist|artist)\/([A-Za-z0-9]+)/);
    if (urlMatch) return { type: urlMatch[1], id: urlMatch[2] };
  } catch { /**/ }
  return null;
};

const buildEmbedUrl = (type: string, id: string) =>
  `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;

const SpotifyTab = () => {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customUrl, setCustomUrl]           = useState('');
  const [customEmbed, setCustomEmbed]       = useState<{ type: string; id: string } | null>(null);
  const [urlError, setUrlError]             = useState('');

  const activePreset = SPOTIFY_PRESETS.find((p) => p.id === selectedPreset);
  const embedSrc = customEmbed
    ? buildEmbedUrl(customEmbed.type, customEmbed.id)
    : activePreset
    ? buildEmbedUrl(activePreset.type, activePreset.spotifyId)
    : null;

  const handleCustomUrl = () => {
    const parsed = parseSpotifyUrl(customUrl.trim());
    if (!parsed) { setUrlError('Paste a valid Spotify link (track, album or playlist)'); return; }
    setUrlError('');
    setSelectedPreset(null);
    setCustomEmbed(parsed);
  };

  const selectPreset = (id: string) => {
    setCustomEmbed(null);
    setCustomUrl('');
    setUrlError('');
    setSelectedPreset((prev) => prev === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* Preset grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SPOTIFY_PRESETS.map((p) => {
          const on = selectedPreset === p.id && !customEmbed;
          return (
            <motion.button
              key={p.id}
              onClick={() => selectPreset(p.id)}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
              style={{
                background: on ? 'rgba(30,215,96,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${on ? 'rgba(30,215,96,0.35)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <span className="text-lg leading-none">{p.emoji}</span>
              <span className={`text-xs font-medium leading-tight ${on ? 'text-green-300' : 'text-white/50'}`}>
                {p.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Custom URL input */}
      <div className="flex gap-2">
        <input
          value={customUrl}
          onChange={(e) => { setCustomUrl(e.target.value); setUrlError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleCustomUrl()}
          placeholder="Paste any Spotify link (track / album / playlist)…"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-white/25 placeholder:text-white/15 transition-colors"
        />
        <button
          onClick={handleCustomUrl}
          className="px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 shrink-0"
          style={{ background: '#1DB954' }}
        >
          Load
        </button>
      </div>
      {urlError && <p className="text-red-400 text-xs -mt-2">{urlError}</p>}

      {/* Spotify embed */}
      <AnimatePresence mode="wait">
        {embedSrc && (
          <motion.div
            key={embedSrc}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <iframe
              src={embedSrc}
              width="100%"
              height="352"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              style={{ borderRadius: 16, border: 'none' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!embedSrc && (
        <div className="flex flex-col items-center gap-2 py-6 text-white/15">
          <Music2 className="w-6 h-6" />
          <p className="text-xs">Choose a playlist above or paste your own Spotify link</p>
          <a
            href="https://open.spotify.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-green-400/60 hover:text-green-400 transition-colors"
          >
            Open Spotify <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <p className="text-white/15 text-xs text-center">
        Spotify Free works · no login needed to load the player
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SHARED: visualizer bars
// ─────────────────────────────────────────────────────────────
const VisualizerBars = ({ playing }: { playing: boolean }) => (
  <div className="flex items-end gap-0.5 h-4">
    {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8].map((h, i) => (
      <motion.div
        key={i}
        className="w-0.5 rounded-full bg-brand-400"
        animate={playing ? { scaleY: [h, 1, h * 0.6, 1, h] } : { scaleY: 0.15 }}
        transition={playing ? { duration: 0.8 + i * 0.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.07 } : { duration: 0.3 }}
        style={{ originY: 1, height: '100%' }}
      />
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────
// AMBIENT STATE
// ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'ff_music';
interface MusicState { volumes: Record<string, number>; master: number; active: string[] }
const loadState = (): MusicState => {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s); } catch { /**/ }
  return { volumes: {}, master: 0.7, active: [] };
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
type Tab = 'ambient' | 'spotify';

export const MusicPlayer = () => {
  const [tab, setTab]         = useState<Tab>('ambient');
  const [state, setState]     = useState<MusicState>(loadState);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const engineRef = useRef<SoundEngine | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const getEngine = useCallback(() => {
    if (!engineRef.current) engineRef.current = new SoundEngine();
    return engineRef.current;
  }, []);

  useEffect(() => { return () => { engineRef.current?.destroy(); }; }, []);

  const togglePlay = () => {
    const eng = getEngine();
    if (playing) {
      eng.suspend(); setPlaying(false);
    } else {
      eng.resume(); eng.setMasterVolume(state.master);
      state.active.forEach((id) => {
        const def = SOUNDS.find((s) => s.id === id);
        if (def) eng.start(id, def.type, state.volumes[id] ?? 0.5);
      });
      setPlaying(true);
    }
  };

  const toggleSound = (def: SoundDef) => {
    const eng = getEngine();
    const isOn = state.active.includes(def.id);
    if (isOn) {
      eng.stop(def.id);
      setState((prev) => ({ ...prev, active: prev.active.filter((id) => id !== def.id) }));
    } else {
      const vol = state.volumes[def.id] ?? 0.5;
      if (playing) eng.start(def.id, def.type, vol);
      setState((prev) => ({ ...prev, active: [...prev.active, def.id], volumes: { ...prev.volumes, [def.id]: vol } }));
    }
  };

  const setSoundVolume = (id: string, vol: number) => {
    engineRef.current?.setVolume(id, vol);
    setState((prev) => ({ ...prev, volumes: { ...prev.volumes, [id]: vol } }));
  };

  const setMaster = (vol: number) => {
    engineRef.current?.setMasterVolume(vol);
    setState((prev) => ({ ...prev, master: vol }));
  };

  const anyActive = state.active.length > 0;

  return (
    <div className="card-dark p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {tab === 'ambient' && playing && anyActive
            ? <VisualizerBars playing={playing} />
            : tab === 'spotify'
            ? <Music2 className="w-4 h-4 text-green-400/60" />
            : <Wind className="w-4 h-4 text-white/40" />
          }
          <p className="text-white font-semibold text-sm">Music</p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Tabs */}
          {(['ambient', 'spotify'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{
                background: tab === t ? (t === 'spotify' ? '#1DB95420' : 'rgba(255,255,255,0.1)') : 'transparent',
                color: tab === t ? (t === 'spotify' ? '#1DB954' : 'white') : 'rgba(255,255,255,0.3)',
                border: `1px solid ${tab === t ? (t === 'spotify' ? '#1DB95440' : 'rgba(255,255,255,0.15)') : 'transparent'}`,
              }}
            >
              {t === 'spotify' ? '󰓇 Spotify' : '🌿 Ambient'}
            </button>
          ))}

          {/* Ambient: master vol + play + expand */}
          {tab === 'ambient' && (
            <>
              <div className="hidden sm:flex items-center gap-1.5 ml-1">
                <VolumeX className="w-3 h-3 text-white/20" />
                <input type="range" min={0} max={1} step={0.01} value={state.master}
                  onChange={(e) => setMaster(Number(e.target.value))}
                  className="w-16 accent-brand-500 cursor-pointer" />
              </div>
              <button onClick={togglePlay} disabled={!anyActive}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 disabled:opacity-30"
                style={{ background: playing ? 'rgb(var(--brand-600))' : 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {playing
                  ? <Pause className="w-3.5 h-3.5 text-white" fill="white" />
                  : <Play  className="w-3.5 h-3.5 text-white" fill="white" style={{ marginLeft: 1 }} />
                }
              </button>
              <button onClick={() => setExpanded((v) => !v)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        {tab === 'ambient' ? (
          <motion.div key="ambient" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Sound grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SOUNDS.map((def) => {
                const on = state.active.includes(def.id);
                return (
                  <motion.button key={def.id} onClick={() => toggleSound(def)} whileTap={{ scale: 0.93 }}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all"
                    style={{
                      background: on ? `${def.color}18` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${on ? def.color + '40' : 'rgba(255,255,255,0.06)'}`,
                      boxShadow: on && playing ? `0 0 14px ${def.color}22` : 'none',
                    }}>
                    <span className="text-xl leading-none">{def.emoji}</span>
                    <span className="text-white/50 text-xs font-medium leading-none">{def.label}</span>
                    {on && (
                      <motion.div className="w-1 h-1 rounded-full" style={{ background: def.color }}
                        animate={playing ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                        transition={{ duration: 1.2, repeat: Infinity }} />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Mix sliders */}
            <AnimatePresence>
              {expanded && anyActive && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-5 pt-4 border-t border-white/[0.05] space-y-3">
                    <p className="text-white/25 text-xs font-semibold uppercase tracking-widest">Mix</p>
                    {state.active.map((id) => {
                      const def = SOUNDS.find((s) => s.id === id)!;
                      const vol = state.volumes[id] ?? 0.5;
                      return (
                        <div key={id} className="flex items-center gap-3">
                          <span className="text-base w-7 text-center leading-none">{def.emoji}</span>
                          <span className="text-white/40 text-xs w-20">{def.label}</span>
                          <input type="range" min={0} max={1} step={0.01} value={vol}
                            onChange={(e) => setSoundVolume(id, Number(e.target.value))}
                            className="flex-1 cursor-pointer" style={{ accentColor: def.color }} />
                          <span className="text-white/20 text-xs w-8 text-right tabular-nums">
                            {Math.round(vol * 100)}%
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex sm:hidden items-center gap-3 pt-1 border-t border-white/[0.04]">
                      <VolumeX className="w-4 h-4 text-white/20" />
                      <input type="range" min={0} max={1} step={0.01} value={state.master}
                        onChange={(e) => setMaster(Number(e.target.value))}
                        className="flex-1 accent-brand-500 cursor-pointer" />
                      <span className="text-white/20 text-xs w-8 text-right tabular-nums">
                        {Math.round(state.master * 100)}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!anyActive && (
              <p className="text-white/15 text-xs text-center mt-4">
                Tap sounds to activate, then press play ▶
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div key="spotify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SpotifyTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
