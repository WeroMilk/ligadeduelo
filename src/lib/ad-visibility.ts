/** Visibilidad del banner de publicidad (LiveMatch lo oculta en decisiones/popups). */
let hidden = false;
const listeners = new Set<() => void>();

export function setAdHidden(value: boolean) {
  if (hidden === value) return;
  hidden = value;
  listeners.forEach(l => l());
}

export function getAdHidden() {
  return hidden;
}

export function subscribeAdHidden(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
