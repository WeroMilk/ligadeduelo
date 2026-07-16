import { disableAdsForever, enableAdsAgain, getAdsDisabledForever } from '@/lib/ad-premium';

export type EasterEggPhase = 'idle' | 'logo' | 'banner' | 'prompt';

type Snapshot = {
  phase: EasterEggPhase;
  logoTaps: number;
  bannerTaps: number;
};

const TAPS_NEEDED = 7;

let phase: EasterEggPhase = 'idle';
let logoTaps = 0;
let bannerTaps = 0;
/** Referencia estable para useSyncExternalStore (Object.is). */
let snapshot: Snapshot = { phase, logoTaps, bannerTaps };
const listeners = new Set<() => void>();

function refreshSnapshot() {
  snapshot = { phase, logoTaps, bannerTaps };
}

function notify() {
  refreshSnapshot();
  listeners.forEach(l => l());
}

export function getEasterEggSnapshot(): Snapshot {
  return snapshot;
}

export function subscribeEasterEgg(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetEasterEgg() {
  if (phase === 'prompt') return;
  if (phase === 'idle' && logoTaps === 0 && bannerTaps === 0) return;
  phase = 'idle';
  logoTaps = 0;
  bannerTaps = 0;
  notify();
}

/**
 * 7 toques en el logo de inicio.
 * - Con ads ON: inicia el flujo logo → banner → contraseña (quitar ads).
 * - Con ads OFF: abre directo el popup de contraseña (restaurar ads).
 */
export function registerLogoTap() {
  if (phase === 'prompt') return;

  // Publicidad ya quitada: solo logo ×7 → popup para volver a activarla
  if (getAdsDisabledForever()) {
    if (phase !== 'idle' && phase !== 'logo') {
      phase = 'logo';
      logoTaps = 0;
    }
    phase = 'logo';
    logoTaps += 1;
    if (logoTaps >= TAPS_NEEDED) {
      phase = 'prompt';
      logoTaps = 0;
      bannerTaps = 0;
    }
    notify();
    return;
  }

  if (phase === 'idle' || phase === 'logo') {
    phase = 'logo';
    logoTaps += 1;
    if (logoTaps >= TAPS_NEEDED) {
      phase = 'banner';
      bannerTaps = 0;
    }
    notify();
  }
}

/** 7 toques en el banner (tras completar el logo). Solo con ads visibles. */
export function registerBannerTap() {
  if (getAdsDisabledForever()) return;
  if (phase !== 'banner') return;

  bannerTaps += 1;
  if (bannerTaps >= TAPS_NEEDED) {
    phase = 'prompt';
  }
  notify();
}

export function closeEasterEggPrompt() {
  phase = 'idle';
  logoTaps = 0;
  bannerTaps = 0;
  notify();
}

/** Contraseña correcta: quita ads si están ON, o las restaura si están OFF. */
export function submitEasterEggCode(code: string): 'ok' | 'bad' {
  if (code.trim() !== '2801') return 'bad';
  if (getAdsDisabledForever()) {
    enableAdsAgain();
  } else {
    disableAdsForever();
  }
  closeEasterEggPrompt();
  return 'ok';
}
