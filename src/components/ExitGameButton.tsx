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
        className="fixed right-3 z-[80] grid h-9 w-9 place-items-center rounded-full border border-[#2A3550]/80 bg-[#0A0E1A]/80 text-[#8B9BB4] hover:text-[#C9A84C] hover:border-[#C9A84C] hover:bg-[#141B2D] transition-colors backdrop-blur-sm"
        style={{
          top: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
          padding: 0,
          lineHeight: 0,
        }}
        aria-label="Salir del juego"
      >
        <X
          size={16}
          strokeWidth={2.25}
          className="pointer-events-none"
          aria-hidden
        />
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
