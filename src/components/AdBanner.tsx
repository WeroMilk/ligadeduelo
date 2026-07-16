/** Banner publicitario sticky — móvil PNG completo; desktop franja baja full-bleed. */
import { useSyncExternalStore } from 'react';
import { registerBannerTap } from '@/lib/ad-easter-egg';
import { getAdsDisabledForever, subscribeAdsDisabledForever } from '@/lib/ad-premium';
import { getAdHidden, subscribeAdHidden } from '@/lib/ad-visibility';

const AD_IMG = '/ads/servipartz-banner.png';
/** Azul del creativo Servipartz (móvil contain). */
const AD_BG = '#5BA8D4';

export default function AdBanner() {
  const hidden = useSyncExternalStore(subscribeAdHidden, getAdHidden, () => false);
  const adsOff = useSyncExternalStore(subscribeAdsDisabledForever, getAdsDisabledForever, () => false);

  if (hidden || adsOff) return null;

  return (
    <aside
      className="relative z-[40] w-full shrink-0 border-t border-white/10 bg-[#0A0E1A] shadow-[0_-8px_28px_rgba(0,0,0,0.45)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="complementary"
      aria-label="Publicidad"
    >
      {/*
        Móvil: PNG completo (object-contain + aspect del creativo).
        Desktop: franja baja full-bleed pegada abajo (object-cover).
      */}
      <button
        type="button"
        onClick={() => registerBannerTap()}
        className="group relative block w-full overflow-hidden transition-[filter] duration-200 hover:brightness-[1.04] active:brightness-95 md:bg-[#0A0E1A]"
        style={{ backgroundColor: AD_BG, userSelect: 'none' }}
        aria-label="Banner publicitario Servipartz"
      >
        <img
          src={AD_IMG}
          alt="Servipartz · Dispensadores de agua · Contáctanos +52 662 404 9965"
          className="pointer-events-none relative z-[1] block w-full object-center aspect-[1024/338] h-auto object-contain md:aspect-auto md:h-[56px] md:object-cover lg:h-[64px]"
          width={1024}
          height={338}
          loading="lazy"
          decoding="async"
          draggable={false}
        />

        <span className="pointer-events-none absolute right-2 top-1.5 z-10 rounded-[3px] border border-white/10 bg-black/60 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/95 shadow-sm backdrop-blur-[3px] md:right-3 md:top-2 md:text-[9px]">
          Publicidad
        </span>
      </button>
    </aside>
  );
}
