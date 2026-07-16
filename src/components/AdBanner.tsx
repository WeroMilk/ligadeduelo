/** Banner publicitario sticky — estilo anuncio web actual (full-bleed). */
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
    <aside
      className="relative z-[40] w-full shrink-0 border-t border-white/10 bg-[#111827]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="complementary"
      aria-label="Publicidad"
    >
      {/*
        Full-bleed como sticky ad de sitios modernos:
        - Móvil ~90px (tipo 320×100)
        - Desktop ~90px leaderboard a todo el ancho
        - Sin márgenes laterales ni franjas de color
      */}
      <button
        type="button"
        onClick={() => registerBannerTap()}
        className="group relative block w-full overflow-hidden bg-[#5BA8D4] transition-[filter] duration-200 hover:brightness-[1.04] active:brightness-95"
        style={{ userSelect: 'none' }}
        aria-label="Banner publicitario Servipartz"
      >
        <img
          src={AD_IMG}
          alt="Servipartz · Dispensadores de agua · Contáctanos +52 662 404 9965"
          className="pointer-events-none block h-[90px] w-full object-cover object-center md:h-[90px] lg:h-[96px]"
          width={1024}
          height={338}
          loading="lazy"
          decoding="async"
          draggable={false}
        />

        <span className="pointer-events-none absolute left-2 top-1.5 z-10 rounded-[2px] bg-black/55 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/90 md:left-3 md:top-2 md:text-[9px]">
          Publicidad
        </span>
      </button>
    </aside>
  );
}
