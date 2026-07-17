import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CombatFloat, TeamColor } from '@/types/game';
import { formatCombatHitNarrative } from '@/lib/combat-flavor';

export const HIT_PAUSE_MS = 5000;

type Props = {
  hit: CombatFloat | null;
  /** Duración visible (debe coincidir con la cola del cine). */
  durationMs?: number;
};

function teamAccent(team: TeamColor | undefined): string {
  if (team === 'blue') return '#3498DB';
  if (team === 'red') return '#E74C3C';
  return '#C9A84C';
}

export default function CombatHitOverlay({ hit, durationMs = HIT_PAUSE_MS }: Props) {
  const [visible, setVisible] = useState<CombatFloat | null>(null);
  const [progressKey, setProgressKey] = useState(0);

  useEffect(() => {
    if (!hit) {
      setVisible(null);
      return;
    }
    setVisible(hit);
    setProgressKey(k => k + 1);
  }, [hit?.id]);

  const narrative = useMemo(
    () => (visible ? formatCombatHitNarrative(visible) : ''),
    [visible],
  );

  if (!visible || typeof document === 'undefined') return null;

  const isHeal = visible.kind === 'heal';
  const accent = isHeal ? '#2ECC71' : teamAccent(visible.sourceTeam);
  const amount = Math.floor(visible.amount);

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center px-4"
      aria-live="polite"
    >
      <div
        key={visible.id}
        className="w-full max-w-lg rounded-2xl border-2 bg-[#0D1220]/96 px-5 py-4 text-center shadow-[0_10px_40px_rgba(0,0,0,0.65)] backdrop-blur-md"
        style={{
          borderColor: accent,
          animation: 'combat-hit-pop 0.45s cubic-bezier(0.22, 1.4, 0.36, 1) both',
        }}
      >
        {visible.sourceName && (
          <p
            className="text-xs font-black uppercase tracking-[0.22em] mb-1.5"
            style={{ color: accent }}
          >
            {visible.sourceName}
          </p>
        )}
        <p
          className="text-base sm:text-lg font-bold leading-snug text-[#F4F1E8]"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {narrative}
        </p>
        <p
          className="mt-2 text-4xl sm:text-5xl font-black tabular-nums"
          style={{
            color: isHeal ? '#2ECC71' : '#E74C3C',
            textShadow: isHeal
              ? '0 2px 12px rgba(46,204,113,0.55)'
              : '0 2px 12px rgba(231,76,60,0.55)',
            animation: 'combat-hit-amount 0.55s ease-out both',
          }}
        >
          {isHeal ? '+' : '−'}{amount}
        </p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/50">
          <div
            key={progressKey}
            className="h-full rounded-full"
            style={{
              backgroundColor: accent,
              animation: `combat-hit-bar ${durationMs}ms linear forwards`,
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes combat-hit-pop {
          from { opacity: 0; transform: scale(0.82) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes combat-hit-amount {
          0% { opacity: 0; transform: scale(0.5); }
          55% { opacity: 1; transform: scale(1.18); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes combat-hit-bar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>,
    document.body,
  );
}
