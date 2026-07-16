import { useGame } from '@/hooks/useGameState';
import { Skull, RotateCcw, Eye } from 'lucide-react';
import { useEffect } from 'react';
import { playDefeatSound, playClickSound } from '@/lib/sounds';

export default function DefeatScreen() {
  const { state, dispatch } = useGame();

  const currentRound = state.tournament?.currentRound ?? 0;
  const roundNames = ['Octavos', 'Cuartos', 'Semifinal', 'Final'];

  useEffect(() => {
    playDefeatSound();
  }, []);

  const handleRestart = () => {
    playClickSound();
    dispatch({ type: 'RESET_TOURNAMENT' });
  };

  const handleViewBracket = () => {
    playClickSound();
    dispatch({ type: 'SET_SCREEN', screen: 'bracket' });
  };

  return (
    <div className="screen-center relative bg-[#0A0E1A] px-4 py-4 md:py-8 safe-top safe-chrome-x safe-bottom overflow-hidden">
      {/* Red vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-[#E74C3C]/10 via-transparent to-transparent" />

      <div className="relative z-10 flex flex-col items-center gap-4 md:gap-6 max-w-sm w-full">
        {/* Skull */}
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-[#E74C3C] to-[#922B21] flex items-center justify-center shadow-[0_0_60px_rgba(231,76,60,0.3)]">
          <Skull className="w-10 h-10 md:w-12 md:h-12 text-[#0A0E1A]" />
        </div>

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[#E74C3C]" style={{ fontFamily: 'Cinzel, serif' }}>
            ELIMINADO
          </h1>
          <p className="text-[#8B9BB4] mt-1 md:mt-2 text-sm">
            Tu equipo ha sido eliminado del torneo
          </p>
        </div>

        {/* Stats */}
        <div className="w-full bg-[#141B2D] rounded-xl border border-[#E74C3C]/30 p-4 text-center">
          <p className="text-[#8B9BB4] text-sm">Kills finales</p>
          <p className="text-2xl font-bold text-[#E74C3C] mt-1">
            {state.turnMatch?.blue.kills ?? 0} – {state.turnMatch?.red.kills ?? 0}
          </p>
          <p className="text-[#8B9BB4] text-xs mt-2">Ronda: {roundNames[currentRound] || 'Octavos'}</p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleRestart}
            className="w-full bg-gradient-to-r from-[#C9A84C] to-[#B8953E] text-[#0A0E1A] font-bold py-4 rounded-xl shadow-[0_4px_20px_rgba(201,168,76,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            NUEVO TORNEO
          </button>
          <button
            onClick={handleViewBracket}
            className="w-full bg-[#141B2D] border border-[#2A3550] text-[#8B9BB4] font-bold py-3 rounded-xl hover:border-[#C9A84C] hover:text-[#F0E6D2] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            VER BRACKET
          </button>
        </div>
      </div>
    </div>
  );
}
