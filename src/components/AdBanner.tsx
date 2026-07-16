/**
 * Banner publicitario permanente.
 * En partida en vivo se oculta solo durante decisiones o popups.
 */
import { useSyncExternalStore } from 'react';
import { getAdHidden, subscribeAdHidden } from '@/lib/ad-visibility';

export default function AdBanner() {
  const hidden = useSyncExternalStore(subscribeAdHidden, getAdHidden, () => false);
  if (hidden) return null;

  return (
    <div
      className="pointer-events-none relative z-[40] w-full shrink-0 px-3 pt-3"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      role="complementary"
      aria-label="Publicidad"
    >
      <div
        className="pointer-events-auto relative mx-auto w-full max-w-lg overflow-hidden rounded-md border-2 border-dashed border-[#C9A84C] bg-white shadow-sm"
        style={{ userSelect: 'none' }}
      >
        <div className="flex items-center justify-between border-b border-[#C9A84C]/40 bg-[#F5F5F5] px-2.5 py-0.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#5A5A5A]">
            Publicidad
          </span>
          <span className="text-[9px] text-[#8A8A8A]">Ad</span>
        </div>

        <div className="flex min-h-[48px] items-center justify-center bg-white px-4 py-3">
          <p className="text-center text-[13px] font-bold tracking-wide text-[#8B6914]">
            Pon tu marca aqui - 6623501632
          </p>
        </div>
      </div>
    </div>
  );
}
