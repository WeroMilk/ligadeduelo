/** Banner publicitario permanente — estilo anuncio web (móvil + desktop). */
import { useSyncExternalStore } from 'react';
import { registerBannerTap } from '@/lib/ad-easter-egg';
import { getAdsDisabledForever, subscribeAdsDisabledForever } from '@/lib/ad-premium';
import { getAdHidden, subscribeAdHidden } from '@/lib/ad-visibility';

const AD_IMG = '/ads/servipartz-banner.png';
/** Azul del creativo Servipartz (evita franjas raras al usar object-contain). */
const AD_BG = '#6EB8E0';

export default function AdBanner() {
  const hidden = useSyncExternalStore(subscribeAdHidden, getAdHidden, () => false);
  const adsOff = useSyncExternalStore(subscribeAdsDisabledForever, getAdsDisabledForever, () => false);

  if (hidden || adsOff) return null;

  return (
    <div
      className="relative z-[40] w-full shrink-0 border-t border-black/10 bg-[#0A0E1A] px-2 py-1.5 shadow-[0_-6px_24px_rgba(0,0,0,0.35)] md:px-4 md:py-2.5"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.375rem)' }}
      role="complementary"
      aria-label="Publicidad"
    >
      {/*
        Formato creativo ~3:1 (1024×338).
        Móvil: ancho completo, altura tipo banner web, contain para no cortar logo/teléfono.
        Desktop: leaderboard centrado, proporción natural del PNG.
      */}
      <button
        type="button"
        className="group relative mx-auto block w-full max-w-3xl overflow-hidden rounded-md border border-white/20 shadow-[0_3px_16px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:brightness-[1.03] active:scale-[0.995] md:w-fit md:max-w-[min(100%,44rem)] md:rounded-lg"
        style={{ backgroundColor: AD_BG, userSelect: 'none' }}
        onClick={() => registerBannerTap()}
        aria-label="Banner publicitario Servipartz"
      >
        <img
          src={AD_IMG}
          alt="Servipartz · Dispensadores de agua · Contáctanos +52 662 404 9965"
          className="pointer-events-none relative z-[1] block h-[76px] w-full object-contain object-center sm:h-[88px] md:h-[100px] md:w-auto md:max-w-full lg:h-[110px]"
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
