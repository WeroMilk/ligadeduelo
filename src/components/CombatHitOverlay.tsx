import type { CombatFloat } from '@/types/game';
import { formatCombatHitNarrative } from '@/lib/combat-flavor';
import { combatFloatStyle } from '@/lib/combat-float-style';

export const HIT_PAUSE_MS = 3000;

type Props = {
  hit: CombatFloat | null;
  /** Duración visible (debe coincidir con la cola del cine). */
  durationMs?: number;
};

export default function CombatHitOverlay({ hit, durationMs = HIT_PAUSE_MS }: Props) {
  if (!hit) return null;

  const narrative = formatCombatHitNarrative(hit);
  const isHeal = hit.kind === 'heal';
  const palette = combatFloatStyle(hit.kind, hit.sourceTeam);
  const amount = Math.floor(hit.amount);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[110] flex items-center justify-center px-3"
      aria-live="polite"
    >
      <div
        key={hit.id}
        className="w-full max-w-lg rounded-2xl border-2 border-transparent px-5 py-4 text-center shadow-[0_10px_40px_rgba(0,0,0,0.65)] backdrop-blur-md"
        style={{
          background: `linear-gradient(rgba(13,18,32,0.96), rgba(13,18,32,0.96)) padding-box, ${palette.fill} border-box`,
          animation: 'combat-hit-pop 0.45s cubic-bezier(0.22, 1.4, 0.36, 1) both',
        }}
      >
        {hit.sourceName && (
          <p
            className="text-xs font-black uppercase tracking-[0.22em] mb-1.5"
            style={{ color: palette.primary }}
          >
            {hit.sourceName}
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
            textShadow: `0 2px 12px ${palette.glow}88`,
            animation: 'combat-hit-amount 0.55s ease-out both',
          }}
        >
          <span style={{ color: palette.signColor }}>{isHeal ? '+' : '−'}</span>
          <span style={{ color: palette.numberColor }}>{amount}</span>
        </p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/50">
          <div
            key={hit.id}
            className="h-full rounded-full"
            style={{
              background: palette.fill,
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
    </div>
  );
}
