/**
 * Interstitial fullscreen tras cada partida (8s).
 * No se puede cerrar; los clics no hacen nada.
 * No se muestra al ganar la final del torneo.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/hooks/useGameState';
import { setAdHidden } from '@/lib/ad-visibility';

export const POST_MATCH_AD_MS = 8000;
const AD_IMG = '/ads/adios-anuncios.png';

function shouldShowPostMatchAd(
  screen: string,
  round: number | undefined,
  roundsLen: number | undefined,
  result: string | null | undefined,
) {
  if (screen !== 'victory' && screen !== 'defeat') return false;
  // Ganar la final → pantalla de campeón, sin este anuncio
  if (screen === 'victory' && result === 'win') {
    const last = (roundsLen ?? 4) - 1;
    if ((round ?? 0) >= last) return false;
  }
  return true;
}

export default function PostMatchAd() {
  const { state } = useGame();
  const [visible, setVisible] = useState(false);

  const screen = state.currentScreen;
  const round = state.tournament?.currentRound;
  const roundsLen = state.tournament?.rounds.length;
  const result = state.matchResult;
  const matchKey = `${screen}:${state.currentMatch?.id ?? 'm'}:${result}:${round}`;

  useEffect(() => {
    if (!shouldShowPostMatchAd(screen, round, roundsLen, result)) {
      setVisible(false);
      return;
    }

    setVisible(true);
    setAdHidden(true);
    const t = window.setTimeout(() => {
      setVisible(false);
      setAdHidden(false);
    }, POST_MATCH_AD_MS);

    return () => {
      window.clearTimeout(t);
      setAdHidden(false);
    };
  }, [matchKey, screen, round, roundsLen, result]);

  if (!visible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[#05080f]"
      role="dialog"
      aria-modal="true"
      aria-label="Publicidad"
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerDown={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Temporizador: línea blanca superior que se agota en 8s */}
      <div
        className="absolute left-0 top-0 z-10 w-full"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        aria-hidden
      >
        <div className="relative h-[3px] w-full overflow-hidden bg-white/10">
          <div
            key={matchKey}
            className="postmatch-timer-bar h-full w-full origin-left"
          />
        </div>
      </div>

      <style>{`
        .postmatch-timer-bar {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.98) 0%,
            rgba(255, 255, 255, 0.88) 72%,
            rgba(255, 255, 255, 0.35) 100%
          );
          box-shadow:
            0 0 14px rgba(255, 255, 255, 0.40),
            0 0 2px rgba(255, 255, 255, 0.85);
          transform-origin: left center;
          animation: postmatch-timer-shrink ${POST_MATCH_AD_MS}ms linear forwards;
        }

        @keyframes postmatch-timer-shrink {
          from { transform: scaleX(1); opacity: 1; }
          to { transform: scaleX(0); opacity: 0.55; }
        }

        @media (prefers-reduced-motion: reduce) {
          .postmatch-timer-bar {
            animation: none;
            transform: scaleX(0);
            opacity: 0.4;
          }
        }
      `}</style>

      <img
        src={AD_IMG}
        alt="¡Adiós anuncios! Transfiere $49 MXN a la cuenta CLABE para disfrutar sin interrupciones."
        className="h-full w-full object-contain select-none pointer-events-none"
        draggable={false}
      />
    </div>,
    document.body,
  );
}
