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
      className="ad-banner-dock pointer-events-none relative z-[40] w-full shrink-0"
      role="complementary"
      aria-label="Publicidad"
    >
      {/* Fundido desde el contenido */}
      <div
        className="pointer-events-none absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-[#0A0E1A] via-[#0A0E1A]/80 to-transparent md:-top-14 md:h-14"
        aria-hidden
      />

      {/* Móvil: tarjeta integrada · Desktop: dock ancho */}
      <div
        className="relative px-3 pt-1 md:left-1/2 md:w-screen md:max-w-none md:-translate-x-1/2 md:border-t md:border-[#C9A84C]/12 md:bg-[#070B14]/96 md:px-0 md:pt-0 md:backdrop-blur-md"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 hidden h-px bg-gradient-to-r from-transparent via-[#C9A84C]/35 to-transparent md:block"
          aria-hidden
        />

        <div
          className="relative mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-[#C9A84C]/30 bg-[#0D1220]/90 shadow-[0_10px_36px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] md:max-w-4xl md:rounded-xl md:border-[#2A3550]/70 md:bg-[#0A0E14] md:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_28px_rgba(0,0,0,0.55)] lg:max-w-5xl"
          style={{ userSelect: 'none' }}
        >
          <span className="absolute right-2 top-2 z-20 rounded-md border border-[#2A3550] bg-[#0A0E1A]/92 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[#8B9BB4] backdrop-blur-sm">
            Publicidad
          </span>

          {/* Móvil: imagen a ancho completo, sin huecos */}
          <div className="relative md:hidden">
            <img
              src={AD_IMG}
              alt="Servipartz · Dispensadores de agua"
              className="block w-full h-auto"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: [
                  'linear-gradient(180deg, rgba(10,14,26,0.35) 0%, transparent 22%, transparent 78%, rgba(10,14,26,0.4) 100%)',
                  'linear-gradient(90deg, rgba(10,14,26,0.25) 0%, transparent 10%, transparent 90%, rgba(10,14,26,0.25) 100%)',
                ].join(', '),
              }}
              aria-hidden
            />
          </div>

          {/* Desktop: marco contenido */}
          <div className="relative hidden md:flex md:h-[58px] md:items-center md:justify-center md:px-6 md:py-2">
            <img
              src={AD_IMG}
              alt="Servipartz · Dispensadores de agua"
              className="max-h-full max-w-full object-contain brightness-[0.97] contrast-[1.02] saturate-[0.92]"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
