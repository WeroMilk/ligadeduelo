/** Banner publicitario permanente. Móvil intacto; en desktop solo el PNG (sin franjas). */
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
      className="relative z-[40] w-full shrink-0 border-t border-white/10 bg-[linear-gradient(90deg,#07111d,#183247_50%,#07111d)] px-2 py-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.28)] md:px-4 md:py-2"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.375rem)' }}
      role="complementary"
      aria-label="Publicidad"
    >
      {/*
        Móvil: ancho completo + cover (igual que antes).
        Desktop: el botón se ajusta al ancho natural del PNG → sin franjas azules.
      */}
      <button
        type="button"
        className="group relative mx-auto block h-[72px] w-full max-w-3xl overflow-hidden rounded-md border border-white/15 bg-[#4f9bc4] shadow-[0_3px_18px_rgba(0,0,0,0.42)] md:flex md:h-[88px] md:w-fit md:max-w-[min(100%,36rem)] md:rounded-lg md:bg-transparent lg:h-[96px]"
        style={{ userSelect: 'none' }}
        onClick={() => registerBannerTap()}
        aria-label="Banner publicitario Servipartz"
      >
        <img
          src={AD_IMG}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-xl saturate-125 md:hidden"
          draggable={false}
        />
        <div
          className="pointer-events-none absolute inset-0 md:hidden"
          style={{
            background:
              'linear-gradient(90deg, rgba(7,17,29,0.22) 0%, transparent 16%, transparent 84%, rgba(7,17,29,0.22) 100%)',
          }}
          aria-hidden
        />

        <img
          src={AD_IMG}
          alt="Servipartz · Dispensadores de agua · Contáctanos +52 662 404 9965"
          className="pointer-events-none relative z-[1] h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.015] md:w-auto md:max-h-full md:object-contain"
          loading="lazy"
          decoding="async"
          draggable={false}
        />

        <span className="pointer-events-none absolute right-1.5 top-1.5 z-10 rounded bg-[#07111d]/75 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-white/90 shadow-sm backdrop-blur-sm md:right-2.5 md:top-2 md:text-[9px]">
          Publicidad
        </span>
      </button>
    </div>
  );
}
