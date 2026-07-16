/** Banner publicitario permanente — estilo anuncio web (móvil + desktop). */
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
      className="relative z-[40] w-full shrink-0 border-t border-black/10 bg-[#0A0E1A] py-1 shadow-[0_-6px_24px_rgba(0,0,0,0.35)] md:px-4 md:py-2"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.25rem)' }}
      role="complementary"
      aria-label="Publicidad"
    >
      {/*
        object-cover: llena el ancho sin franjas laterales.
        Altura baja → se ve más alargado horizontalmente (tipo banner web).
      */}
      <button
        type="button"
        className="group relative mx-auto block w-full overflow-hidden border-y border-white/15 bg-[#0A0E1A] shadow-[0_3px_16px_rgba(0,0,0,0.4)] transition-[filter] duration-300 hover:brightness-[1.03] active:scale-[0.998] md:max-w-5xl md:rounded-lg md:border md:border-white/20 lg:max-w-6xl"
        style={{ userSelect: 'none' }}
        onClick={() => registerBannerTap()}
        aria-label="Banner publicitario Servipartz"
      >
        <img
          src={AD_IMG}
          alt="Servipartz · Dispensadores de agua · Contáctanos +52 662 404 9965"
          className="pointer-events-none relative z-[1] block h-[58px] w-full object-cover object-center sm:h-[64px] md:h-[72px] lg:h-[80px]"
          loading="lazy"
          decoding="async"
          draggable={false}
        />

        <span className="pointer-events-none absolute right-1.5 top-1.5 z-10 rounded bg-black/55 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-white/95 shadow-sm backdrop-blur-[2px] md:right-2.5 md:top-2 md:text-[9px]">
          Publicidad
        </span>
      </button>
    </div>
  );
}
