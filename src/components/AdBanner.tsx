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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[9999]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="complementary"
      aria-label="Publicidad"
    >
      <div
        className="pointer-events-auto flex w-full items-center justify-center border-t border-[#C9A84C]/40 bg-[#1A1520] px-3 py-2"
        style={{ userSelect: 'none' }}
      >
        <p className="text-center text-[12px] font-bold tracking-wide text-[#C9A84C]">
          Pon tu marca aqui - 6623501632
        </p>
      </div>
    </div>
  );
}
