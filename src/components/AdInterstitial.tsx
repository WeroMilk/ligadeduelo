/**
 * Interstitial fullscreen reutilizable (mismo creativo que post-partida).
 * No se puede cerrar; al terminar llama onComplete.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { pushAdHidden, popAdHidden } from '@/lib/ad-visibility';
import { getAdsDisabledForever } from '@/lib/ad-premium';

export const POST_MATCH_AD_MS = 8000;
export const QTE_REPLAY_AD_MS = 10000;
const AD_IMG = '/ads/adios-anuncios.png';

type Props = {
  open: boolean;
  durationMs: number;
  onComplete: () => void;
  /** Si true y el usuario tiene premium, salta el anuncio al instante. */
  respectPremium?: boolean;
};

export default function AdInterstitial({
  open,
  durationMs,
  onComplete,
  respectPremium = true,
}: Props) {
  useEffect(() => {
    if (!open) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onComplete();
    };

    if (respectPremium && getAdsDisabledForever()) {
      finish();
      return;
    }

    pushAdHidden();
    const t = window.setTimeout(finish, durationMs);

    return () => {
      window.clearTimeout(t);
      popAdHidden();
    };
  }, [open, durationMs, onComplete, respectPremium]);

  if (!open) return null;
  if (respectPremium && getAdsDisabledForever()) return null;

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
      <div
        className="absolute left-0 top-0 z-10 w-full"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        aria-hidden
      >
        <div className="relative h-[3px] w-full overflow-hidden bg-white/10">
          <div
            key={`${open}-${durationMs}`}
            className="ad-interstitial-timer-bar h-full w-full origin-left"
          />
        </div>
      </div>

      <style>{`
        .ad-interstitial-timer-bar {
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
          animation: ad-interstitial-timer-shrink ${durationMs}ms linear forwards;
        }

        @keyframes ad-interstitial-timer-shrink {
          from { transform: scaleX(1); opacity: 1; }
          to { transform: scaleX(0); opacity: 0.55; }
        }

        @media (prefers-reduced-motion: reduce) {
          .ad-interstitial-timer-bar {
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
