/**
 * Banner publicitario permanente.
 * En partida en vivo se oculta solo durante decisiones o popups.
 */
import { useSyncExternalStore } from 'react';
import { getAdHidden, subscribeAdHidden } from '@/lib/ad-visibility';

const AD_HREF = 'tel:+526624049965';
const AD_IMG = '/ads/servipartz.png';

export default function AdBanner() {
  const hidden = useSyncExternalStore(subscribeAdHidden, getAdHidden, () => false);
  if (hidden) return null;

  return (
    <div
      className="relative z-[40] w-full shrink-0 px-3 pt-2"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      role="complementary"
      aria-label="Publicidad"
    >
      <a
        href={AD_HREF}
        className="relative mx-auto block w-full max-w-lg overflow-hidden rounded-lg border border-[#2A3550]/80 bg-[#0E121C] shadow-[0_4px_18px_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]"
        style={{ userSelect: 'none' }}
        aria-label="Publicidad Servipartz · Contáctanos +52 662 404 9965"
      >
        <span className="absolute left-2 top-1.5 z-10 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/90">
          Publicidad
        </span>
        <span className="absolute right-2 top-1.5 z-10 rounded bg-black/40 px-1.5 py-0.5 text-[9px] text-white/70">
          Ad
        </span>

        <img
          src={AD_IMG}
          alt="Servipartz · Dispensadores de agua · Contáctanos +52 662 404 9965"
          className="block h-auto w-full object-contain object-center bg-[#5CB6E5]"
          style={{ maxHeight: 110 }}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </a>
    </div>
  );
}
