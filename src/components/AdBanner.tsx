/**
 * Banner publicitario permanente.
 * En partida en vivo se oculta solo durante decisiones o popups.
 */
import { useSyncExternalStore } from 'react';
import { getAdHidden, subscribeAdHidden } from '@/lib/ad-visibility';

const AD_IMG = '/ads/servipartz.png';

export default function AdBanner() {
  const hidden = useSyncExternalStore(subscribeAdHidden, getAdHidden, () => false);
  if (hidden) return null;

  return (
    <div
      className="pointer-events-none relative z-[40] w-full shrink-0 px-3 pt-1"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 0px))' }}
      role="complementary"
      aria-label="Publicidad"
    >
      <div
        className="relative mx-auto flex h-[52px] w-full max-w-2xl items-center justify-center overflow-hidden rounded-md border border-[#2A3550]/80 bg-[#0E121C] shadow-[0_2px_12px_rgba(0,0,0,0.35)] sm:h-[60px] md:h-[72px] lg:max-w-3xl lg:h-[80px]"
        style={{ userSelect: 'none' }}
      >
        <span className="absolute right-1 top-1 z-10 rounded bg-black/55 px-1 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white/90">
          Publicidad
        </span>

        <img
          src={AD_IMG}
          alt="Servipartz · Dispensadores de agua"
          className="max-h-full max-w-full object-contain"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </div>
    </div>
  );
}
