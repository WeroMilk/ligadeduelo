import { useEffect, useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import { CHAMPIONS } from '@/lib/game-data';
import { Trophy, Swords, ChevronRight, Crown, User } from 'lucide-react';

export default function BracketScreen() {
  const { state, dispatch } = useGame();
  const [simulating, setSimulating] = useState(false);

  const tournament = state.tournament;
  if (!tournament) return null;

  const currentRoundIdx = tournament.currentRound;
  const currentRound = tournament.rounds[currentRoundIdx];

  // Simulate AI matches on mount
  useEffect(() => {
    if (currentRound && !simulating) {
      const hasUnsimulatedAI = currentRound.matches.some(m => !m.isPlayerMatch && m.winner === null);
      if (hasUnsimulatedAI) {
        setSimulating(true);
        const timer = setTimeout(() => {
          dispatch({ type: 'SIMULATE_AI_MATCHES' });
          setSimulating(false);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [currentRoundIdx]);

  const playerMatch = currentRound?.matches.find(m => m.isPlayerMatch && m.winner === null);

  const handleStartMatch = (matchId: string) => {
    dispatch({ type: 'START_MATCH', matchId });
  };

  const handleAdvance = () => {
    dispatch({ type: 'ADVANCE_BRACKET' });
  };

  const getMatchWinner = (match: { winner: string | null; teamA: { name: string }; teamB: { name: string } }) => {
    if (!match.winner) return null;
    return match.winner === 'blue' ? match.teamA.name : match.teamB.name;
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex flex-col">
      {/* Header */}
      <div className="bg-[#0A0E1A]/95 backdrop-blur-sm border-b border-[#1E2740] px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[#F0E6D2] font-bold text-lg" style={{ fontFamily: 'Cinzel, serif' }}>
                Torneo
              </h2>
              <p className="text-[#8B9BB4] text-sm">
                {currentRound?.roundName || ''} · Ronda {currentRoundIdx + 1}/4
              </p>
            </div>
            <div className="flex items-center gap-2 bg-[#141B2D] rounded-lg px-3 py-2">
              <Crown className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-[#C9A84C] font-bold text-sm">
                {state.playerTeamName || 'Mi Equipo'}
              </span>
            </div>
          </div>

          {/* Round indicator */}
          <div className="flex gap-2 mt-3">
            {['Octavos', 'Cuartos', 'Semifinal', 'Final'].map((name, i) => (
              <div
                key={name}
                className={`flex-1 h-1.5 rounded-full ${
                  i < currentRoundIdx ? 'bg-[#C9A84C]' :
                  i === currentRoundIdx ? 'bg-gradient-to-r from-[#C9A84C] to-[#C9A84C]/30' :
                  'bg-[#1E2740]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Matches */}
      <div className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        {simulating && (
          <div className="text-center py-4 mb-4">
            <div className="inline-flex items-center gap-2 text-[#8B9BB4]">
              <div className="w-4 h-4 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
              Simulando partidos IA...
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {currentRound?.matches.map(match => {
            const isPlayer = match.isPlayerMatch;
            const winner = match.winner;
            const winnerName = getMatchWinner(match);

            return (
              <div
                key={match.id}
                className={`rounded-xl border-2 p-4 transition-all ${
                  isPlayer && !winner
                    ? 'border-[#C9A84C] bg-[#C9A84C]/5 shadow-[0_0_20px_rgba(201,168,76,0.1)]'
                    : winner
                    ? 'border-[#1E2740] bg-[#0D111F] opacity-60'
                    : 'border-[#1E2740] bg-[#141B2D]'
                }`}
              >
                {/* Teams */}
                <div className="flex items-center justify-between">
                  {/* Team A */}
                  <div className={`flex items-center gap-2 flex-1 ${winner === 'red' ? 'opacity-40' : ''}`}>
                    <div className="flex -space-x-1.5">
                      {match.teamA.champions.slice(0, 3).map(c => {
                        const def = CHAMPIONS.find(ch => ch.id === c.defId);
                        return def?.image ? (
                          <img key={c.defId} src={def.image} alt={def.name} className="w-6 h-6 rounded-full border border-[#0A0E1A] object-cover" />
                        ) : (
                          <div key={c.defId} className="w-6 h-6 rounded-full border border-[#0A0E1A] flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: def?.color || '#333' }}>
                            <User className="w-3 h-3" />
                          </div>
                        );
                      })}
                    </div>
                    <span className={`text-sm font-bold truncate ${match.teamA.id === 'player' ? 'text-[#C9A84C]' : 'text-[#F0E6D2]'}`}>
                      {match.teamA.name}
                    </span>
                  </div>

                  {/* VS / Winner */}
                  <div className="mx-3 flex-shrink-0">
                    {winner ? (
                      <Trophy className="w-4 h-4 text-[#C9A84C]" />
                    ) : (
                      <span className="text-[#8B9BB4] text-xs font-bold">VS</span>
                    )}
                  </div>

                  {/* Team B */}
                  <div className={`flex items-center gap-2 flex-1 justify-end ${winner === 'blue' ? 'opacity-40' : ''}`}>
                    <span className={`text-sm font-bold truncate text-right ${match.teamB.id === 'player' ? 'text-[#C9A84C]' : 'text-[#F0E6D2]'}`}>
                      {match.teamB.name}
                    </span>
                    <div className="flex -space-x-1.5">
                      {match.teamB.champions.slice(0, 3).map(c => {
                        const def = CHAMPIONS.find(ch => ch.id === c.defId);
                        return def?.image ? (
                          <img key={c.defId} src={def.image} alt={def.name} className="w-6 h-6 rounded-full border border-[#0A0E1A] object-cover" />
                        ) : (
                          <div key={c.defId} className="w-6 h-6 rounded-full border border-[#0A0E1A] flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: def?.color || '#333' }}>
                            <User className="w-3 h-3" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Result or Action */}
                {winner ? (
                  <p className="text-center text-[#C9A84C] text-xs mt-2 font-bold">
                    Ganador: {winnerName}
                  </p>
                ) : isPlayer ? (
                  <button
                    onClick={() => handleStartMatch(match.id)}
                    className="w-full mt-3 bg-gradient-to-r from-[#C9A84C] to-[#B8953E] text-[#0A0E1A] font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <Swords className="w-4 h-4" />
                    JUGAR PARTIDO
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Advance button if no player match */}
        {!playerMatch && currentRound?.matches.every(m => m.winner !== null) && (
          <button
            onClick={handleAdvance}
            className="w-full mt-4 bg-gradient-to-r from-[#C9A84C] to-[#B8953E] text-[#0A0E1A] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-[0_4px_20px_rgba(201,168,76,0.3)]"
          >
            AVANZAR RONDA
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
