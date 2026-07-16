/**
 * Banner publicitario permanente (excepto durante partida en vivo).
 * No se puede cerrar ni ocultar fuera de liveMatch.
 */
import { useGame } from '@/hooks/useGameState';

export default function AdBanner() {
  const { state } = useGame();
  if (state.currentScreen === 'liveMatch') return null;

  return (
    <div
      className="pointer-events-none relative z-[9999] w-full shrink-0 px-3"
      style={{
        marginTop: '-12px',
        marginBottom: '-8px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      role="complementary"
      aria-label="Publicidad"
    >
      <div
        className="pointer-events-auto relative mx-auto w-full max-w-lg overflow-hidden rounded-md border-2 border-dashed border-[#C9A84C]/55 bg-[#0E121C] shadow-[inset_0_0_0_1px_rgba(201,168,76,0.12)]"
        style={{ userSelect: 'none' }}
      >
        {/* Franja tipo ad network */}
        <div className="flex items-center justify-between border-b border-[#C9A84C]/25 bg-[#161B28] px-2.5 py-0.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#8B9BB4]">
            Publicidad
          </span>
          <span className="text-[9px] text-[#4A5570]">Ad</span>
        </div>

        <div className="flex min-h-[52px] items-center justify-center px-4 py-3.5">
          <p className="text-center text-[13px] font-bold tracking-wide text-[#C9A84C]">
            Pon tu marca aqui - 6623501632
          </p>
        </div>
      </div>
    </div>
  );
}
