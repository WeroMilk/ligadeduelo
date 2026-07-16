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
      className="pointer-events-none relative z-[40] w-full shrink-0 px-3 pt-2"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      role="complementary"
      aria-label="Publicidad"
    >
      <div
        className="relative mx-auto h-[88px] w-full max-w-5xl overflow-hidden rounded-md border border-[#2A3550]/80 bg-[#0E121C] shadow-[0_4px_18px_rgba(0,0,0,0.35)] sm:h-[110px] md:h-[140px] lg:h-[160px]"
        style={{ userSelect: 'none' }}
      >
        <span className="absolute right-1.5 top-1.5 z-10 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/90">
          Publicidad
        </span>

        <img
          src={AD_IMG}
          alt="Servipartz · Dispensadores de agua"
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </div>
    </div>
  );
}
