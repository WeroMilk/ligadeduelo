/**
 * Banner publicitario permanente. No se puede cerrar ni ocultar.
 */
export default function AdBanner() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[9999] safe-bottom"
      role="complementary"
      aria-label="Publicidad"
    >
      <div className="mx-auto w-full max-w-3xl px-3 pb-2">
        <div
          className="pointer-events-auto flex h-12 sm:h-14 items-center justify-center rounded-lg border border-[#C9A84C]/45 bg-gradient-to-r from-[#1A1520] via-[#2A1F14] to-[#1A1520] px-3 shadow-[0_-4px_24px_rgba(0,0,0,0.45)]"
          style={{ userSelect: 'none' }}
        >
          <p
            className="text-center text-[12px] sm:text-sm font-bold tracking-wide text-[#C9A84C] uppercase"
            style={{ fontFamily: 'Cinzel, Georgia, serif' }}
          >
            Pon tu marca aqui - 6623501632
          </p>
        </div>
      </div>
    </div>
  );
}
