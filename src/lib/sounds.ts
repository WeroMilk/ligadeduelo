/** Efectos de sonido cortos vía Web Audio (sin assets externos). */

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  return audioCtx;
}

function beep(freq: number, duration: number, type: OscillatorType = 'square', gain = 0.04) {
  const c = ctx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
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

export function playVictorySound() {
  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.15, 'triangle', 0.05), i * 120));
}

export function playClickSound() {
  beep(900, 0.04, 'sine', 0.03);
}
