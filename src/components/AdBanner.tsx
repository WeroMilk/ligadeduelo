/**
 * Banner publicitario permanente.
 * Creativa a tamaño completo + relleno difuminado a lo ancho (sin letterbox negro).
 */
import { useSyncExternalStore } from 'react';
import { registerBannerTap } from '@/lib/ad-easter-egg';
import { getAdsDisabledForever, subscribeAdsDisabledForever } from '@/lib/ad-premium';
import { getAdHidden, subscribeAdHidden } from '@/lib/ad-visibility';

const AD_IMG = '/ads/servipartz-banner.png';

export default function AdBanner() {
  const hidden = useSyncExternalStore(subscribeAdHidden, getAdHidden, () => false);
  const adsOff = useSyncExternalStore(subscribeAdsDisabledForever, getAdsDisabledForever, () => false);

  if (hidden || adsOff) return null;

  return (
    <div
      className="relative z-[40] w-full shrink-0 border-t border-white/5 bg-[#05080f]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="complementary"
      aria-label="Publicidad"
    >
      <button
        type="button"
        className="relative mx-auto block h-[72px] w-full max-w-5xl overflow-hidden md:h-[100px]"
        style={{ userSelect: 'none' }}
        onClick={() => registerBannerTap()}
        aria-label="Banner publicitario Servipartz"
      >
        {/* Extiende el color de la creativa a todo el ancho */}
        <img
          src={AD_IMG}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-55 blur-2xl saturate-125"
          draggable={false}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(5,8,15,0.55) 0%, transparent 18%, transparent 82%, rgba(5,8,15,0.55) 100%)',
          }}
          aria-hidden
        />

        <img
          src={AD_IMG}
          alt="Servipartz · Dispensadores de agua · Contáctanos +52 662 404 9965"
          className="pointer-events-none relative z-[1] mx-auto h-full w-auto max-w-full object-contain drop-shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
          loading="lazy"
          decoding="async"
          draggable={false}
        />

        <span className="pointer-events-none absolute right-2 top-1.5 z-10 rounded-[3px] bg-black/50 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-white/90 backdrop-blur-[2px] md:text-[8px]">
          Publicidad
        </span>
      </button>
    </div>
  );
}
