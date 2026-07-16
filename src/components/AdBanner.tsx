/** Banner publicitario sticky — móvil PNG completo (más chico); desktop franja ancha pro. */
import { useSyncExternalStore } from 'react';
import { registerBannerTap } from '@/lib/ad-easter-egg';
import { getAdsDisabledForever, subscribeAdsDisabledForever } from '@/lib/ad-premium';
import { getAdHidden, subscribeAdHidden } from '@/lib/ad-visibility';

const AD_IMG = '/ads/servipartz-banner.png';
const AD_BG = '#5BA8D4';

export default function AdBanner() {
  const hidden = useSyncExternalStore(subscribeAdHidden, getAdHidden, () => false);
  const adsOff = useSyncExternalStore(subscribeAdsDisabledForever, getAdsDisabledForever, () => false);

  if (hidden || adsOff) return null;

  return (
    <aside
      className="relative z-[40] w-full shrink-0 border-t border-white/10 bg-[#0A0E1A] shadow-[0_-10px_32px_rgba(0,0,0,0.5)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="complementary"
      aria-label="Publicidad"
    >
      <button
        type="button"
        onClick={() => registerBannerTap()}
        className="group relative block w-full overflow-hidden transition-[filter] duration-200 hover:brightness-[1.03] active:brightness-95"
        style={{ userSelect: 'none' }}
        aria-label="Banner publicitario Servipartz"
      >
        {/* Móvil: PNG completo, un poco más chico */}
        <span
          className="flex w-full items-center justify-center md:hidden"
          style={{ backgroundColor: AD_BG }}
        >
          <img
            src={AD_IMG}
            alt="Servipartz · Dispensadores de agua · Contáctanos +52 662 404 9965"
            className="pointer-events-none block h-auto w-[86%] max-w-[400px] object-contain object-center"
            width={1024}
            height={338}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </span>

        {/*
          Desktop: franja full-bleed baja pero con altura suficiente
          para leer el creativo (antes 56px lo destrozaba).
        */}
        <img
          src={AD_IMG}
          alt="Servipartz · Dispensadores de agua · Contáctanos +52 662 404 9965"
          className="pointer-events-none relative z-[1] hidden h-[130px] w-full object-cover object-[center_38%] md:block lg:h-[140px]"
          width={1024}
          height={338}
          loading="lazy"
          decoding="async"
          draggable={false}
        />

        <span className="pointer-events-none absolute right-2 top-1.5 z-10 rounded-[3px] border border-white/15 bg-black/65 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/95 shadow-sm backdrop-blur-[3px] md:right-3 md:top-2 md:text-[9px]">
          Publicidad
        </span>
      </button>
    </aside>
  );
}
