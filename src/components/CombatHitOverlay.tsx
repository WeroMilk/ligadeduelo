import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import type { CombatFloat } from '@/types/game';
import { formatCombatHitNarrative } from '@/lib/combat-flavor';
import { combatFloatStyle } from '@/lib/combat-float-style';
import { playCritSound, vibrate } from '@/lib/sounds';

export const HIT_PAUSE_MS = 3000;

type Props = {
  hit: CombatFloat | null;
  /** Duración visible (debe coincidir con la cola del cine). */
  durationMs?: number;
};

export default function CombatHitOverlay({ hit, durationMs = HIT_PAUSE_MS }: Props) {
  const critKey = hit && hit.kind === 'damage' && hit.amount >= 150 ? hit.id : null;
  useEffect(() => {
    if (critKey == null) return;
    playCritSound();
    vibrate([25, 30, 45]);
  }, [critKey]);

  if (!hit) return null;

  const narrative = formatCombatHitNarrative(hit);
  const isHeal = hit.kind === 'heal';
  const isCrit = hit.kind === 'damage' && hit.amount >= 150;
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
        {isCrit && (
          <p className="mt-1 text-xs font-black uppercase tracking-[0.3em] text-[#F1C40F] drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
            ¡Crítico!
          </p>
        )}
        <div
          className={`mt-2 flex items-center justify-center gap-2 ${isCrit ? 'animate-combat-crit' : ''}`}
          style={isCrit ? undefined : { animation: 'combat-hit-amount 0.55s ease-out both' }}
        >
          {isHeal ? (
            <Plus
              className="shrink-0 drop-shadow-[0_2px_8px_rgba(46,204,113,0.55)]"
              style={{ width: '2.25rem', height: '2.25rem', color: palette.signColor }}
              strokeWidth={3}
            />
          ) : (
            <span
              className={`font-black tabular-nums ${isCrit ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl'}`}
              style={{ textShadow: isCrit ? '0 2px 16px #F1C40Fcc' : `0 2px 12px ${palette.glow}88`, color: isCrit ? '#F1C40F' : palette.signColor }}
            >
              −
            </span>
          )}
          <span
            className={`font-black tabular-nums ${isCrit ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl'}`}
            style={{ textShadow: isCrit ? '0 2px 16px #F1C40Fcc' : `0 2px 12px ${palette.glow}88`, color: isCrit ? '#F1C40F' : palette.numberColor }}
          >
            {amount}
          </span>
        </div>
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
