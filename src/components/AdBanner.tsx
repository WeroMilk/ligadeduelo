/** Banner publicitario: PNG completo, compacto y centrado (sin franjas azules). */
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
      className="relative z-[40] w-full shrink-0 border-t border-white/10 bg-[#0A0E1A] shadow-[0_-8px_28px_rgba(0,0,0,0.45)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="complementary"
      aria-label="Publicidad"
    >
      {/*
        Móvil + desktop: creativo completo, chiquito y centrado.
        Fondo oscuro de la app → sin franjas azules laterales.
      */}
      <button
        type="button"
        onClick={() => registerBannerTap()}
        className="group relative mx-auto flex w-full max-w-[min(100%,16.5rem)] items-center justify-center overflow-hidden bg-transparent py-0 transition-[filter] duration-200 hover:brightness-[1.03] active:brightness-95 sm:max-w-[18rem] md:max-w-[22rem]"
        style={{ userSelect: 'none' }}
        aria-label="Banner publicitario Servipartz"
      >
        <img
          src={AD_IMG}
          alt="Servipartz · Dispensadores de agua · Contáctanos +52 662 404 9965"
          className="pointer-events-none relative z-[1] block h-auto w-full rounded-md object-contain object-center leading-none shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
          width={1024}
          height={338}
          loading="lazy"
          decoding="async"
          draggable={false}
        />

        <span className="pointer-events-none absolute right-1.5 top-2 z-10 rounded-[3px] border border-white/15 bg-black/65 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.12em] text-white/95 shadow-sm backdrop-blur-[3px] md:right-2 md:top-2.5 md:text-[8px]">
          Publicidad
        </span>
      </button>
    </aside>
  );
}
