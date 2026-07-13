import { useGame } from '@/hooks/useGameState';
import { playClickSound } from '@/lib/sounds';
import { Vote } from 'lucide-react';

export default function SpectatorVote() {
  const { state, dispatch } = useGame();
  const match = state.currentMatch;
  const winner = state.lastSpectatorWinner ?? state.simulationSnapshot?.winner;
  const winnerName = winner === 'blue' ? match?.teamA.name : match?.teamB.name;

  const vote = (side: 'A' | 'B') => {
    playClickSound();
    dispatch({ type: 'SPECTATOR_VOTE', votedTeam: side });
  };

  return (
    <div className="min-h-app bg-[#0A0E1A] flex flex-col items-center justify-center px-4 py-8 safe-top safe-bottom">
      <div className="w-12 h-12 rounded-full bg-[#141B2D] border border-[#C9A84C]/40 flex items-center justify-center mb-4">
        <Vote className="w-6 h-6 text-[#C9A84C]" />
      </div>
      <h1 className="text-2xl font-bold text-[#F0E6D2] text-center" style={{ fontFamily: 'Cinzel, serif' }}>
        ¿Quién merecía ganar?
      </h1>
      <p className="text-[#8B9BB4] text-sm text-center mt-2 max-w-sm">
        El motor dice <span className="text-[#C9A84C] font-bold">{winnerName}</span>.
        Tu voto es show puro — el resultado ya está escrito.
      </p>

      <div className="w-full max-w-sm mt-8 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => vote('A')}
          className="w-full min-h-12 rounded-xl border border-[#3498DB]/40 bg-[#3498DB]/10 text-[#8EC8FF] font-bold active:scale-[0.98]"
        >
          Merecía {match?.teamA.name}
        </button>
        <button
          type="button"
          onClick={() => vote('B')}
          className="w-full min-h-12 rounded-xl border border-[#E74C3C]/40 bg-[#E74C3C]/10 text-[#F5B7B1] font-bold active:scale-[0.98]"
        >
          Merecía {match?.teamB.name}
        </button>
      </div>
    </div>
  );
}
