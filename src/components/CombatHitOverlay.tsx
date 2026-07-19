import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import type { CombatFloat } from '@/types/game';
import { formatCombatHitNarrative } from '@/lib/combat-flavor';
import { combatFloatStyle } from '@/lib/combat-float-style';
import { playCritSound, playHealSound, playHitSound, vibrate } from '@/lib/sounds';

export const HIT_PAUSE_MS = 2000;

type Props = {
  hit: CombatFloat | null;
  /** Duración visible (debe coincidir con la cola del cine). */
  durationMs?: number;
  /** Congela la barra/animación del popup. */
  paused?: boolean;
};

export default function CombatHitOverlay({ hit, durationMs = HIT_PAUSE_MS, paused = false }: Props) {
  const hitKey = hit?.id ?? null;
  const isHealHit = hit?.kind === 'heal';
  const isCritHit = !!(hit && hit.kind === 'damage' && hit.amount >= 150);

  useEffect(() => {
    if (hitKey == null || !hit) return;
    if (hit.kind === 'heal') {
      playHealSound();
      return;
    }
    if (hit.kind === 'damage') {
      if (hit.amount >= 150) {
        playCritSound();
        vibrate([25, 30, 45]);
      } else {
        playHitSound();
      }
    }
  }, [hitKey, hit]);

  if (!hit || typeof document === 'undefined') return null;

  const narrative = formatCombatHitNarrative(hit);
  const isHeal = isHealHit;
  const isCrit = isCritHit;
  const palette = combatFloatStyle(hit.kind, hit.sourceTeam);
  const amount = Math.floor(hit.amount);
  // Evita repetir el nombre si ya va en la narrativa
  const showSourceHeader = !!(
    hit.sourceName
    && !narrative.toLowerCase().startsWith(hit.sourceName.trim().toLowerCase())
  );

  const body = (
    <div
      className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center px-3"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
      }}
      aria-live="polite"
    >
      <div
        key={hit.id}
        className="w-full max-w-[min(100%,22rem)] sm:max-w-lg rounded-2xl border-2 border-transparent px-4 py-3.5 sm:px-5 sm:py-4 text-center shadow-[0_10px_40px_rgba(0,0,0,0.65)] backdrop-blur-md"
        style={{
          background: `linear-gradient(rgba(13,18,32,0.96), rgba(13,18,32,0.96)) padding-box, ${palette.fill} border-box`,
          animation: 'combat-hit-pop 0.45s cubic-bezier(0.22, 1.4, 0.36, 1) both',
          animationPlayState: paused ? 'paused' : 'running',
        }}
      >
        {showSourceHeader && (
          <p
            className="text-[10px] sm:text-xs font-black uppercase tracking-[0.22em] mb-1.5"
            style={{ color: palette.primary }}
          >
            {hit.sourceName}
          </p>
        )}
        <p
          className="text-sm sm:text-lg font-bold leading-snug text-[#F4F1E8]"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {narrative}
        </p>
        {isCrit && (
          <p className="mt-1 text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-[#F1C40F] drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
            ¡Crítico!
          </p>
        )}
        <div
          className={`mt-2 flex items-center justify-center gap-2 ${isCrit ? 'animate-combat-crit' : ''}`}
          style={{
            animation: isCrit ? undefined : 'combat-hit-amount 0.55s ease-out both',
            animationPlayState: paused ? 'paused' : 'running',
          }}
        >
          {isHeal ? (
            <Plus
              className="shrink-0 drop-shadow-[0_2px_8px_rgba(46,204,113,0.55)]"
              style={{ width: '2rem', height: '2rem', color: palette.signColor }}
              strokeWidth={3}
            />
          ) : (
            <span
              className={`font-black tabular-nums ${isCrit ? 'text-4xl sm:text-6xl' : 'text-3xl sm:text-5xl'}`}
              style={{ textShadow: `0 2px 12px ${palette.glow}88`, color: palette.signColor }}
            >
              −
            </span>
          )}
          <span
            className={`font-black tabular-nums ${isCrit ? 'text-4xl sm:text-6xl' : 'text-3xl sm:text-5xl'}`}
            style={{ textShadow: `0 2px 12px ${palette.glow}88`, color: palette.numberColor }}
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
              animationPlayState: paused ? 'paused' : 'running',
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

  return createPortal(body, document.body);
}
