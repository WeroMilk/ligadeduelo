import { useGame } from '@/hooks/useGameState';
import { X } from 'lucide-react';
import { useState } from 'react';

export default function ExitGameButton() {
  const { state, dispatch } = useGame();
  const [open, setOpen] = useState(false);

  if (state.currentScreen === 'modeSelect') return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-3 right-3 z-[80] md:top-7 lg:top-8 safe-top w-9 h-9 p-0 rounded-full border border-[#2A3550]/80 bg-[#0A0E1A]/70 text-[#8B9BB4] hover:text-[#C9A84C] hover:border-[#C9A84C] hover:bg-[#141B2D] inline-flex items-center justify-center overflow-hidden leading-none transition-colors backdrop-blur-sm"
        aria-label="Salir del juego"
      >
        <X className="size-4 shrink-0 block" strokeWidth={2.5} aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 bg-black/70">
          <div className="w-full max-w-sm rounded-2xl border-2 border-[#2A3550] bg-[#141B2D] p-5 space-y-4">
            <h2 className="text-lg font-bold text-[#F0E6D2]" style={{ fontFamily: 'Cinzel, serif' }}>
              ¿Salir al menú?
            </h2>
            <p className="text-sm text-[#8B9BB4]">Se pierden el torneo y la partida actuales.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 min-h-11 rounded-xl border border-[#2A3550] text-[#8B9BB4] font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  dispatch({ type: 'EXIT_TO_MODE' });
                }}
                className="flex-1 min-h-11 rounded-xl font-bold bg-[#E74C3C] text-white"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
