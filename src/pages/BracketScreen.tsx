import { useEffect, useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import { CHAMPIONS, RIVAL_TEAM_ID } from '@/lib/game-data';
import { Trophy, Swords, ChevronRight, Crown, User, Ghost } from 'lucide-react';

const AI_MATCH_DELAY_MS = 1100;

export default function BracketScreen() {
  const { state, dispatch } = useGame();
  const [simulating, setSimulating] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  const tournament = state.tournament;
  const currentRoundIdx = tournament?.currentRound ?? 0;
  const currentRound = tournament?.rounds[currentRoundIdx];
  const winnersKey = currentRound?.matches.map(m => `${m.id}:${m.winner ?? '-'}`).join('|') ?? '';

  // Resolver partidos IA uno a uno (solo resultado, sin canvas)
  useEffect(() => {
    if (!currentRound) return;

    const next = currentRound.matches.find(m => !m.isPlayerMatch && m.winner === null);
    if (!next) {
      setSimulating(false);
      setActiveMatchId(null);
      return;
    }

    setSimulating(true);
    setActiveMatchId(next.id);

    const timer = setTimeout(() => {
      dispatch({ type: 'SIMULATE_ONE_AI_MATCH' });
    }, AI_MATCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [currentRoundIdx, winnersKey, dispatch, currentRound]);

  if (!tournament || !currentRound) return null;

  const playerMatch = currentRound.matches.find(m => m.isPlayerMatch && m.winner === null);
  const pendingCount = currentRound.matches.filter(m => !m.isPlayerMatch && m.winner === null).length;
  const activeMatch = currentRound.matches.find(m => m.id === activeMatchId);

  const handleStartMatch = (matchId: string) => {
    if (simulating) return;
    dispatch({ type: 'PREPARE_MATCH', matchId });
  };

  const handleAdvance = () => {
    dispatch({ type: 'ADVANCE_BRACKET' });
  };

  const getMatchWinner = (match: { winner: string | null; teamA: { name: string }; teamB: { name: string } }) => {
    if (!match.winner) return null;
    return match.winner === 'blue' ? match.teamA.name : match.teamB.name;
  };

  const isRivalTeam = (id: string) => id === RIVAL_TEAM_ID || id === tournament.rivalTeamId;

  return (
    <div className="h-app bg-[#0A0E1A] flex flex-col overflow-hidden">
      <div className="shrink-0 bg-[#0A0E1A] border-b border-[#1E2740] px-4 py-3 safe-top">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-[#F0E6D2] font-bold text-lg" style={{ fontFamily: 'Cinzel, serif' }}>
                Torneo
              </h2>
              <p className="text-[#8B9BB4] text-sm">
                {currentRound?.roundName || ''} · Ronda {currentRoundIdx + 1}/4
              </p>
            </div>
            <div className="flex items-center gap-2 bg-[#141B2D] rounded-lg px-3 py-2 max-w-[45%] min-w-0">
              <Crown className="w-4 h-4 text-[#C9A84C] shrink-0" />
              <span className="text-[#C9A84C] font-bold text-sm truncate">
                {state.playerTeamName || 'Mi Equipo'}
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#6B1FA6]/35 bg-[#6B1FA6]/10 px-2.5 py-1.5">
            <Ghost className="w-3.5 h-3.5 text-[#C39BD3] shrink-0" />
            <p className="text-[11px] text-[#C39BD3] truncate">
              Rival: <span className="font-bold">La Sombra Eterna</span>
              {state.defeatedRival ? ' · ¡vencida!' : ' · te persigue en el bracket'}
            </p>
          </div>

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

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 max-w-lg mx-auto w-full safe-bottom">
        {simulating && (
          <div className="text-center py-3 mb-3">
            <div className="inline-flex flex-col items-center gap-1 text-[#8B9BB4]">
              <div className="inline-flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Resolviendo partido IA…</span>
              </div>
              {activeMatch && (
                <p className="text-xs text-[#C9A84C]">
                  {activeMatch.teamA.name} vs {activeMatch.teamB.name}
                  {pendingCount > 1 ? ` · ${pendingCount} restantes` : ''}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {currentRound?.matches.map(match => {
            const isPlayer = match.isPlayerMatch;
            const winner = match.winner;
            const winnerName = getMatchWinner(match);
            const isActive = simulating && match.id === activeMatchId;
            const hasRival = isRivalTeam(match.teamA.id) || isRivalTeam(match.teamB.id);

            return (
              <div
                key={match.id}
                className={`rounded-xl border-2 p-4 transition-all ${
                  isActive
                    ? 'border-[#3498DB] bg-[#3498DB]/10 shadow-[0_0_20px_rgba(52,152,219,0.15)]'
                    : hasRival && !winner
                    ? 'border-[#6B1FA6] bg-[#6B1FA6]/10 shadow-[0_0_18px_rgba(107,31,166,0.2)]'
                    : isPlayer && !winner
                    ? 'border-[#C9A84C] bg-[#C9A84C]/5 shadow-[0_0_20px_rgba(201,168,76,0.1)]'
                    : winner
                    ? 'border-[#1E2740] bg-[#0D111F] opacity-60'
                    : 'border-[#1E2740] bg-[#141B2D]'
                }`}
              >
                {hasRival && (
                  <p className="text-[10px] text-[#C39BD3] font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Ghost className="w-3 h-3" /> Rivalidad
                  </p>
                )}
                <div className="flex items-center justify-between gap-1">
                  <div className={`flex items-center gap-2 flex-1 min-w-0 ${winner === 'red' ? 'opacity-40' : ''}`}>
                    <div className="flex -space-x-1.5 shrink-0">
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
                    <span className={`text-sm font-bold truncate min-w-0 ${
                      match.teamA.id === 'player' ? 'text-[#C9A84C]' :
                      isRivalTeam(match.teamA.id) ? 'text-[#C39BD3]' : 'text-[#F0E6D2]'
                    }`}>
                      {match.teamA.name}
                    </span>
                  </div>

                  <div className="mx-2 flex-shrink-0">
                    {winner ? (
                      <Trophy className="w-4 h-4 text-[#C9A84C]" />
                    ) : (
                      <span className="text-[#8B9BB4] text-xs font-bold">VS</span>
                    )}
                  </div>

                  <div className={`flex items-center gap-2 flex-1 min-w-0 justify-end ${winner === 'blue' ? 'opacity-40' : ''}`}>
                    <span className={`text-sm font-bold truncate min-w-0 text-right ${
                      match.teamB.id === 'player' ? 'text-[#C9A84C]' :
                      isRivalTeam(match.teamB.id) ? 'text-[#C39BD3]' : 'text-[#F0E6D2]'
                    }`}>
                      {match.teamB.name}
                    </span>
                    <div className="flex -space-x-1.5 shrink-0">
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

                {winner ? (
                  <p className="text-center text-[#C9A84C] text-xs mt-2 font-bold">
                    Ganador: {winnerName}
                  </p>
                ) : isActive ? (
                  <p className="text-center text-[#3498DB] text-xs mt-2 font-bold animate-pulse">
                    En disputa…
                  </p>
                ) : isPlayer ? (
                  <button
                    type="button"
                    onClick={() => handleStartMatch(match.id)}
                    disabled={simulating}
                    className="w-full mt-3 min-h-11 bg-gradient-to-r from-[#C9A84C] to-[#B8953E] text-[#0A0E1A] font-bold py-3 rounded-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
                  >
                    <Swords className="w-4 h-4" />
                    JUGAR PARTIDO
                  </button>
                ) : (
                  <p className="text-center text-[#4A5570] text-xs mt-2">
                    En espera…
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {!playerMatch && currentRound?.matches.every(m => m.winner !== null) && (
          <button
            type="button"
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
