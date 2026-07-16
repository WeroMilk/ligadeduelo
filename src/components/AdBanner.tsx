/**
 * Banner publicitario permanente (formato clásico leaderboard).
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
      className="relative z-[40] w-full shrink-0 bg-[#0A0E1A] px-3 pt-2 md:px-2 md:pt-0.5"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 0px))' }}
      role="complementary"
      aria-label="Publicidad"
    >
      <div
        className="relative mx-auto w-full max-w-[728px] rounded-sm bg-[#111827]"
        style={{ userSelect: 'none' }}
      >
        <span className="absolute right-0.5 top-0.5 z-10 rounded bg-black/65 px-1 py-px text-[7px] font-bold uppercase tracking-[0.1em] text-white/85 md:right-1 md:top-1 md:px-1 md:py-0.5 md:text-[8px]">
          Publicidad
        </span>

        <img
          src={AD_IMG}
          alt="Servipartz · Dispensadores de agua"
          className="block h-auto w-full"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </div>
    </div>
  );
}
