/** Visibilidad del banner de publicidad (LiveMatch / intersticiales lo ocultan). */
let hideCount = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(l => l());
}

/** Incrementa/decrementa ocultamiento. Reentrante: LiveMatch + interstitial pueden coexistir. */
export function pushAdHidden() {
  hideCount += 1;
  if (hideCount === 1) notify();
}

export function popAdHidden() {
  hideCount = Math.max(0, hideCount - 1);
  if (hideCount === 0) notify();
}

/** API legacy: true = forzar oculto, false = liberar una capa. */
export function setAdHidden(value: boolean) {
  if (value) pushAdHidden();
  else popAdHidden();
}

export function getAdHidden() {
  return hideCount > 0;
}

export function subscribeAdHidden(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
