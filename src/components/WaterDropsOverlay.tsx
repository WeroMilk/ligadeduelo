import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type Drop = {
  id: number;
  leftPct: number;
  sizePx: number;
  delayMs: number;
  durationMs: number;
  swayPx: number;
};

type Props = {
  /** Cambia en cada clic para relanzar la lluvia. */
  nonce: number;
  onDone: () => void;
};

const DROP_COUNT = 34;
const MAX_LIFETIME_MS = 2600;

function buildDrops(): Drop[] {
  return Array.from({ length: DROP_COUNT }, (_, i) => ({
    id: i,
    leftPct: Math.random() * 100,
    sizePx: 10 + Math.random() * 20,
    delayMs: Math.random() * 700,
    durationMs: 1100 + Math.random() * 900,
    swayPx: (Math.random() - 0.5) * 60,
  }));
}

export default function WaterDropsOverlay({ nonce, onDone }: Props) {
  const drops = useMemo(() => buildDrops(), [nonce]);

  useEffect(() => {
    const t = window.setTimeout(onDone, MAX_LIFETIME_MS);
    return () => window.clearTimeout(t);
  }, [nonce, onDone]);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    const r = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(r);
  }, [nonce]);

  const body = (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden" aria-hidden>
      <style>{`
        @keyframes water-drop-fall {
          0% { transform: translate(0, -12vh) scale(0.85); opacity: 0; }
          12% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translate(var(--sway), 112vh) scale(1); opacity: 0; }
        }
      `}</style>
      {drops.map(d => (
        <span
          key={`${nonce}-${d.id}`}
          className="absolute top-0"
          style={{
            left: `${d.leftPct}%`,
            width: d.sizePx,
            height: d.sizePx * 1.35,
            ['--sway' as string]: `${d.swayPx}px`,
            borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%',
            background:
              'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.9) 0%, rgba(173,216,230,0.75) 30%, rgba(52,152,219,0.7) 70%, rgba(30,110,170,0.75) 100%)',
            boxShadow:
              '0 2px 8px rgba(52,152,219,0.45), inset 0 -2px 4px rgba(255,255,255,0.5)',
            transform: 'translate(0, -12vh)',
            opacity: 0,
            animation: ready
              ? `water-drop-fall ${d.durationMs}ms cubic-bezier(0.45,0,0.7,1) ${d.delayMs}ms forwards`
              : 'none',
          }}
        />
      ))}
    </div>
  );

  return createPortal(body, document.body);
}
