import { useGame } from '@/hooks/useGameState';
import { Skull, RotateCcw, Eye } from 'lucide-react';

export default function DefeatScreen() {
  const { state, dispatch } = useGame();

  const currentRound = state.tournament?.currentRound ?? 0;
  const roundNames = ['Octavos', 'Cuartos', 'Semifinal', 'Final'];

  const handleRestart = () => {
    dispatch({ type: 'RESET_TOURNAMENT' });
  };

  const handleViewBracket = () => {
    dispatch({ type: 'SET_SCREEN', screen: 'bracket' });
  };

  return (
    <div className="screen-center relative bg-[#0A0E1A] px-4 py-8 safe-top safe-bottom">
      {/* Red vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-[#E74C3C]/10 via-transparent to-transparent" />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm w-full">
        {/* Skull */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#E74C3C] to-[#922B21] flex items-center justify-center shadow-[0_0_60px_rgba(231,76,60,0.3)]">
          <Skull className="w-12 h-12 text-[#0A0E1A]" />
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#E74C3C]" style={{ fontFamily: 'Cinzel, serif' }}>
            ELIMINADO
          </h1>
          <p className="text-[#8B9BB4] mt-2">
            Tu equipo ha sido eliminado del torneo
          </p>
        </div>

        {/* Stats */}
        <div className="w-full bg-[#141B2D] rounded-xl border border-[#E74C3C]/30 p-4 text-center">
          <p className="text-[#8B9BB4] text-sm">Marcador final</p>
          <p className="text-2xl font-bold text-[#E74C3C] mt-1">
            {state.turnMatch?.blue.score ?? 0} – {state.turnMatch?.red.score ?? 0}
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
