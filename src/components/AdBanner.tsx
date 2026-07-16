/**
 * Banner publicitario permanente (formato IAB clásico).
 * Móvil ≈ 320×50 · Desktop ≈ 728×90.
 */
import { useSyncExternalStore } from 'react';
import { registerBannerTap } from '@/lib/ad-easter-egg';
import { getAdsDisabledForever, subscribeAdsDisabledForever } from '@/lib/ad-premium';
import { getAdHidden, subscribeAdHidden } from '@/lib/ad-visibility';

const AD_IMG = '/ads/servipartz.png';

export default function AdBanner() {
  const hidden = useSyncExternalStore(subscribeAdHidden, getAdHidden, () => false);
  const adsOff = useSyncExternalStore(subscribeAdsDisabledForever, getAdsDisabledForever, () => false);

  if (hidden || adsOff) return null;

  return (
    <div
      className="relative z-[40] w-full shrink-0 bg-[#0A0E1A] px-2 pt-1 md:px-3 md:pt-1"
      style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom, 0px))' }}
      role="complementary"
      aria-label="Publicidad"
    >
      <button
        type="button"
        className="relative mx-auto flex h-[50px] w-full max-w-[728px] items-center justify-center overflow-hidden rounded-sm border border-[#2A3550]/70 bg-[#0E121C] md:h-[90px]"
        style={{ userSelect: 'none' }}
        onClick={() => registerBannerTap()}
        aria-label="Banner publicitario"
      >
        <span className="pointer-events-none absolute right-1 top-0.5 z-10 rounded bg-black/65 px-1 py-px text-[7px] font-bold uppercase tracking-[0.1em] text-white/85 md:top-1 md:text-[8px]">
          Publicidad
        </span>

        <img
          src={AD_IMG}
          alt="Servipartz · Dispensadores de agua"
          className="pointer-events-none h-full w-full object-contain"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </button>
    </div>
  );
}
