/** Audio del juego: SFX + música medieval procedural (Web Audio, sin assets). */

const LS_MUSIC = 'ligadeduelo_music_muted';
const LS_SFX = 'ligadeduelo_sfx_muted';

let audioCtx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let droneNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
let melodyTimer: number | null = null;
let musicPlaying = false;
let unlocked = false;

type Prefs = { musicMuted: boolean; sfxMuted: boolean };
const listeners = new Set<(p: Prefs) => void>();

function readBool(key: string, fallback = false): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === '1' || v === 'true';
  } catch {
    return fallback;
  }
}

function writeBool(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function getAudioPrefs(): Prefs {
  return {
    musicMuted: readBool(LS_MUSIC, false),
    sfxMuted: readBool(LS_SFX, false),
  };
}

function notify() {
  const p = getAudioPrefs();
  listeners.forEach(cb => cb(p));
}

export function subscribeAudioPrefs(cb: (p: Prefs) => void): () => void {
  listeners.add(cb);
  cb(getAudioPrefs());
  return () => { listeners.delete(cb); };
}

/** Crea el contexto solo tras un gesto (unlockAudio). Evita el warning de autoplay. */
function createCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  audioCtx = new AC();
  return audioCtx;
}

function runningCtx(): AudioContext | null {
  if (!unlocked || !audioCtx || audioCtx.state !== 'running') return null;
  return audioCtx;
}

function resetMusicNodes() {
  try {
    if (melodyTimer != null) {
      window.clearInterval(melodyTimer);
      melodyTimer = null;
    }
    for (const n of droneNodes) {
      try { n.osc.stop(); } catch { /* */ }
      try { n.gain.disconnect(); } catch { /* */ }
    }
    droneNodes = [];
    musicGain?.disconnect();
    musicGain = null;
  } catch {
    /* ignore */
  }
  musicPlaying = false;
}

/** Reanuda el contexto y restaura música si quedó marcada como activa. */
export async function ensureAudioRunning(): Promise<boolean> {
  const c = createCtx();
  if (!c) return false;
  try {
    if (c.state === 'suspended') await c.resume();
    unlocked = c.state === 'running';
    if (!unlocked) return false;

    if (musicPlaying && !musicGain && !getAudioPrefs().musicMuted) {
      musicPlaying = false;
      startBackgroundMusic();
    }
    return true;
  } catch {
    unlocked = false;
    return false;
  }
}

export async function unlockAudio(): Promise<void> {
  const ok = await ensureAudioRunning();
  if (ok && !getAudioPrefs().musicMuted && !musicPlaying) startBackgroundMusic();
}

function beep(freq: number, duration: number, type: OscillatorType = 'square', gain = 0.04) {
  if (getAudioPrefs().sfxMuted) return;
  const play = () => {
    try {
      const c = runningCtx();
      if (!c) return;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const now = c.currentTime;
      g.gain.setValueAtTime(Math.max(0.0001, gain), now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.01, duration));
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      /* ignore */
    }
  };

  if (runningCtx()) {
    play();
    return;
  }
  void ensureAudioRunning().then(ok => {
    if (ok) play();
  });
}

export function playClickSound() {
  beep(880, 0.045, 'sine', 0.035);
}

export function playDecideSound() {
  beep(520, 0.06, 'triangle', 0.04);
  setTimeout(() => beep(720, 0.08, 'triangle', 0.035), 50);
}

export function playHitSound() {
  beep(180, 0.05, 'sawtooth', 0.045);
  setTimeout(() => beep(90, 0.08, 'square', 0.03), 30);
}

export function playKillSound() {
  beep(520, 0.08, 'square', 0.05);
  setTimeout(() => beep(780, 0.1, 'square', 0.04), 60);
}

export function playFirstBloodSound() {
  beep(220, 0.12, 'sawtooth', 0.05);
  setTimeout(() => beep(440, 0.12, 'sawtooth', 0.05), 80);
  setTimeout(() => beep(880, 0.18, 'triangle', 0.06), 160);
}

export function playMultiKillSound() {
  beep(600, 0.07, 'square', 0.05);
  setTimeout(() => beep(750, 0.07, 'square', 0.05), 70);
  setTimeout(() => beep(900, 0.12, 'square', 0.055), 140);
}

export function playTowerSound() {
  beep(160, 0.2, 'triangle', 0.06);
  setTimeout(() => beep(120, 0.25, 'sawtooth', 0.04), 100);
}

export function playObjectiveSound() {
  beep(330, 0.1, 'triangle', 0.045);
  setTimeout(() => beep(440, 0.12, 'triangle', 0.04), 90);
  setTimeout(() => beep(554, 0.16, 'sine', 0.04), 180);
}

export function playVictorySound() {
  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.15, 'triangle', 0.05), i * 120));
}

export function playDefeatSound() {
  beep(300, 0.18, 'sawtooth', 0.04);
  setTimeout(() => beep(220, 0.22, 'triangle', 0.04), 140);
  setTimeout(() => beep(150, 0.3, 'sine', 0.035), 280);
}

export function playZoneHitSound() {
  beep(990, 0.05, 'sine', 0.04);
}

export function playZoneMissSound() {
  beep(140, 0.1, 'sawtooth', 0.035);
}

const MELODY = [
  146.83, 164.81, 174.61, 196.0, 220.0, 246.94, 261.63, 293.66,
  261.63, 246.94, 220.0, 196.0, 174.61, 164.81, 146.83, 174.61,
];

function playMelodyNote(freq: number, dur = 0.35) {
  if (getAudioPrefs().musicMuted || !musicGain) return;
  try {
    const c = runningCtx();
    if (!c || !musicGain) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const now = c.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.085, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  } catch {
    /* ignore */
  }
}

function addDrone(freq: number, vol: number) {
  const c = runningCtx();
  if (!c || !musicGain) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.value = vol;
  osc.connect(gain);
  gain.connect(musicGain);
  osc.start();
  droneNodes.push({ osc, gain });
}

export function startBackgroundMusic() {
  if (getAudioPrefs().musicMuted) return;
  if (musicPlaying && musicGain) return;

  if (musicPlaying && !musicGain) {
    resetMusicNodes();
  }

  const c = runningCtx();
  if (!c) return;
  try {
    musicGain = c.createGain();
    musicGain.gain.value = 0.92;
    musicGain.connect(c.destination);

    addDrone(73.42, 0.07); // D2
    addDrone(110, 0.04); // A2 quinta

    let i = 0;
    melodyTimer = window.setInterval(() => {
      if (getAudioPrefs().musicMuted) return;
      playMelodyNote(MELODY[i % MELODY.length], 0.42);
      i += 1;
    }, 520);

    musicPlaying = true;
  } catch {
    musicPlaying = false;
  }
}

export function stopBackgroundMusic() {
  resetMusicNodes();
}

export function setMusicMuted(muted: boolean) {
  writeBool(LS_MUSIC, muted);
  if (muted) stopBackgroundMusic();
  else void unlockAudio();
  notify();
}

export function setSfxMuted(muted: boolean) {
  writeBool(LS_SFX, muted);
  notify();
}
