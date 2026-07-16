import { useEffect, useState } from 'react';

export type ScreenFxKind = 'hit' | 'kill' | 'tower' | 'objective';

type FxEvent = {
  id: number;
  kind: ScreenFxKind;
  label?: string;
  team?: 'blue' | 'red' | 'neutral';
};

type Props = {
  /** Increment / change to fire a new effect */
  signal: { kind: ScreenFxKind; label?: string; team?: 'blue' | 'red' | 'neutral'; nonce: number } | null;
};

let fxId = 0;

export default function CombatScreenFX({ signal }: Props) {
  const [events, setEvents] = useState<FxEvent[]>([]);

  useEffect(() => {
    if (!signal) return;
    const id = ++fxId;
    const ev: FxEvent = {
      id,
      kind: signal.kind,
      label: signal.label,
      team: signal.team ?? 'neutral',
    };
    setEvents(prev => [...prev.slice(-4), ev]);
    const ms = signal.kind === 'kill' ? 1200 : signal.kind === 'objective' ? 1000 : 450;
    const t = window.setTimeout(() => {
      setEvents(prev => prev.filter(e => e.id !== id));
    }, ms);
    return () => window.clearTimeout(t);
  }, [signal?.nonce]);

  if (events.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {events.map(ev => {
        if (ev.kind === 'kill') {
          return (
            <div key={ev.id} className="absolute inset-0 animate-blood-screen">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(120,0,0,0.55)_100%)]" />
              <div className="absolute inset-0 animate-blood-splatter opacity-90"
                style={{
                  backgroundImage: `
                    radial-gradient(circle at 12% 18%, rgba(160,10,10,0.95) 0 8px, transparent 10px),
                    radial-gradient(circle at 88% 22%, rgba(140,0,0,0.9) 0 14px, transparent 16px),
                    radial-gradient(circle at 20% 78%, rgba(180,20,20,0.85) 0 11px, transparent 13px),
                    radial-gradient(circle at 78% 82%, rgba(120,0,0,0.9) 0 16px, transparent 18px),
                    radial-gradient(circle at 50% 8%, rgba(200,30,30,0.7) 0 6px, transparent 8px),
                    radial-gradient(circle at 6% 50%, rgba(150,0,0,0.8) 0 10px, transparent 12px),
                    radial-gradient(circle at 94% 55%, rgba(130,0,0,0.85) 0 12px, transparent 14px)
                  `,
                }}
              />
              {ev.label && (
                <div className="absolute inset-x-0 top-[28%] flex justify-center px-4">
                  <p
                    className="animate-kill-banner text-center text-3xl sm:text-4xl font-black tracking-wider text-[#FF3B3B] drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
                    style={{ fontFamily: 'Cinzel, serif' }}
                  >
                    {ev.label}
                  </p>
                </div>
              )}
            </div>
          );
        }

        if (ev.kind === 'hit') {
          return (
            <div
              key={ev.id}
              className="absolute inset-0 animate-hit-flash"
              style={{
                background:
                  ev.team === 'blue'
                    ? 'radial-gradient(circle at 40% 50%, rgba(52,152,219,0.35), transparent 55%)'
                    : ev.team === 'red'
                      ? 'radial-gradient(circle at 60% 50%, rgba(231,76,60,0.4), transparent 55%)'
                      : 'radial-gradient(circle at 50% 50%, rgba(241,196,15,0.3), transparent 55%)',
              }}
            />
          );
        }

        if (ev.kind === 'tower') {
          return (
            <div key={ev.id} className="absolute inset-0 animate-hit-flash bg-[radial-gradient(circle,rgba(52,152,219,0.25),transparent_60%)]">
              {ev.label && (
                <div className="absolute inset-x-0 top-[32%] flex justify-center">
                  <p className="animate-kill-banner text-[#85C1E9] text-xl font-bold drop-shadow-lg">{ev.label}</p>
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={ev.id} className="absolute inset-0 animate-obj-flash">
            {ev.label && (
              <div className="absolute inset-x-0 top-[30%] flex justify-center px-4">
                <p className="animate-kill-banner text-[#F5B041] text-2xl font-bold text-center drop-shadow-lg">
                  {ev.label}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
