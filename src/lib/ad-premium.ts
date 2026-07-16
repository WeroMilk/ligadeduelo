/** Publicidad desactivada permanentemente (easter egg). */
const STORAGE_KEY = 'liga_duelo_ads_off';

let disabledForever = false;
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(l => l());
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    disabledForever = localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    disabledForever = false;
  }
}

export function getAdsDisabledForever(): boolean {
  load();
  return disabledForever;
}

export function disableAdsForever() {
  load();
  if (disabledForever) return;
  disabledForever = true;
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
  notify();
}

/** Vuelve a mostrar la publicidad (revierte el easter egg). */
export function enableAdsAgain() {
  load();
  if (!disabledForever) return;
  disabledForever = false;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

export function subscribeAdsDisabledForever(listener: () => void) {
  load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const AD_UNLOCK_CODE = '2801';
