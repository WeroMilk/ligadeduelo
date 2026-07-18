import { useEffect, useState } from 'react';
import { useGame } from '@/hooks/useGameState';
import { CHAMPIONS } from '@/lib/game-data';
import { getHumanTeamSetup, humanTeamId, isCoopLocal, isHumanTeamId } from '@/lib/coop';
import { getBracketTimings } from '@/lib/express-mode';
import { Trophy, Swords, ChevronRight, Crown, User } from 'lucide-react';
import { playClickSound } from '@/lib/sounds';
import BracketMatchModal from '@/components/BracketMatchModal';
import type { Match } from '@/types/game';

const DEFAULT_AI_MATCH_DELAY_MS = 1100;

export default function BracketScreen() {
  const { state, dispatch } = useGame();
  const aiMatchDelayMs = getBracketTimings(state.gameMode).aiMatchDelayMs || DEFAULT_AI_MATCH_DELAY_MS;
  const [simulating, setSimulating] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const tournament = state.tournament;
  const isCoop = isCoopLocal(state.gameMode);
  const currentRoundIdx = tournament?.currentRound ?? 0;
  const currentRound = tournament?.rounds[currentRoundIdx];
  const winnersKey = currentRound?.matches.map(m => `${m.id}:${m.winner ?? '-'}`).join('|') ?? '';

  // Resolver partidas IA uno a uno (solo resultado, sin canvas)
  useEffect(() => {
    if (!currentRound) return;

    const next = currentRound.matches.find(
      m => m.winner === null && (!m.humanTeamIds || m.humanTeamIds.length === 0),
    );
    if (!next) {
      setSimulating(false);
      setActiveMatchId(null);
      return;
    }

    setSimulating(true);
    setActiveMatchId(next.id);

    const timer = setTimeout(() => {
      dispatch({ type: 'SIMULATE_ONE_AI_MATCH' });
    }, aiMatchDelayMs);

    return () => clearTimeout(timer);
  }, [currentRoundIdx, winnersKey, dispatch, currentRound, aiMatchDelayMs]);

  if (!tournament || !currentRound) return null;

  const playerMatch = currentRound.matches.find(m => m.isPlayerMatch && m.winner === null);
  const pendingCount = currentRound.matches.filter(
    m => m.winner === null && (!m.humanTeamIds || m.humanTeamIds.length === 0),
  ).length;
  const activeMatch = currentRound.matches.find(m => m.id === activeMatchId);

  const handleStartMatch = (matchId: string) => {
    if (simulating) return;
    playClickSound();
    dispatch({ type: 'PREPARE_MATCH', matchId });
  };

  const handleAdvance = () => {
    playClickSound();
    dispatch({ type: 'ADVANCE_BRACKET' });
  };

  const handleOpenSummary = (match: Match) => {
    playClickSound();
    setSelectedMatch(match);
  };

  const getMatchWinner = (match: { winner: string | null; teamA: { name: string }; teamB: { name: string } }) => {
    if (!match.winner) return null;
    return match.winner === 'blue' ? match.teamA.name : match.teamB.name;
  };

  const humanLabel = (teamId: string) => getHumanTeamSetup(state.humanTeams, teamId)?.teamName ?? teamId;

  const matchButtonLabel = (match: Match) => {
    if (match.isPvpMatch) return 'ENTRAR A PARTIDA · PvP';
    const hid = match.humanTeamIds?.[0];
    if (hid) return `ENTRAR · Turno de ${humanLabel(hid)}`;
    return 'ENTRAR A PARTIDA';
  };

  return (
    <div className="flex-1 min-h-0 w-full bg-[#0A0E1A] flex flex-col overflow-hidden">
      <div className="shrink-0 bg-[#0A0E1A] border-b border-[#1E2740] px-4 pb-2 pt-0 safe-top safe-chrome-x md:py-3">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center">
            {isCoop && state.humanTeams.some(Boolean) ? (
              <div className="inline-flex flex-wrap items-center justify-center gap-2 max-w-full">
                {state.humanTeams.map((team, i) => team && (
                  <div
                    key={humanTeamId(i)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 min-w-0 border ${
                      i % 2 === 0
                        ? 'bg-[#3498DB]/15 border-[#3498DB]/40'
                        : 'bg-[#E74C3C]/15 border-[#E74C3C]/40'
                    }`}
                  >
                    <User className={`w-4 h-4 shrink-0 ${i % 2 === 0 ? 'text-[#3498DB]' : 'text-[#E74C3C]'}`} />
                    <span className={`font-bold text-sm truncate ${i % 2 === 0 ? 'text-[#3498DB]' : 'text-[#E74C3C]'}`}>
                      {team.teamName}
                    </span>
                  </div>
                ))}
              </div>
            ) : isCoop && state.lobbyPlayers.length >= 2 ? (
              <div className="inline-flex flex-wrap items-center justify-center gap-2 max-w-full">
                {state.lobbyPlayers.map((p, i) => (
                  <div
                    key={p.id}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 min-w-0 border ${
                      i % 2 === 0
                        ? 'bg-[#3498DB]/15 border-[#3498DB]/40'
                        : 'bg-[#E74C3C]/15 border-[#E74C3C]/40'
                    }`}
                  >
                    <User className={`w-4 h-4 shrink-0 ${i % 2 === 0 ? 'text-[#3498DB]' : 'text-[#E74C3C]'}`} />
                    <span className={`font-bold text-sm truncate ${i % 2 === 0 ? 'text-[#3498DB]' : 'text-[#E74C3C]'}`}>
                      {p.teamName.trim() || p.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-[#141B2D] rounded-lg px-3 py-1.5 md:py-2 max-w-[90%] min-w-0">
                <Crown className="w-4 h-4 text-[#C9A84C] shrink-0" />
                <span className="text-[#C9A84C] font-bold text-sm truncate text-center">
                  {state.playerTeamName || 'Mi Equipo'}
                </span>
              </div>
            )}
          </div>

          <div className="mt-1.5 md:mt-2 text-center">
            <h2 className="text-[#F0E6D2] font-bold text-base md:text-lg" style={{ fontFamily: 'Cinzel, serif' }}>
              Torneo
            </h2>
            <p className="text-[#8B9BB4] text-xs md:text-sm">
              {currentRound?.roundName || ''} · Ronda {currentRoundIdx + 1}/4
            </p>
          </div>

          <div className="flex gap-2 mt-2 md:mt-3">
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

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide px-3 py-2 pb-3 md:px-4 md:py-4 max-w-6xl lg:max-w-7xl mx-auto w-full flex flex-col">
        {simulating && (
          <div className="text-center py-1 mb-2 shrink-0 md:py-2 md:mb-3">
            <div className="inline-flex flex-col items-center gap-1 text-[#8B9BB4]">
              <div className="inline-flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Espera tu turno</span>
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

        <div
          className={`flex flex-col gap-2 md:grid md:gap-4 md:auto-rows-min ${
            (currentRound?.matches.length || 0) <= 2
              ? 'md:grid-cols-2 md:max-w-3xl md:mx-auto md:w-full'
              : (currentRound?.matches.length || 0) <= 4
                ? 'md:grid-cols-2 lg:grid-cols-4'
                : 'md:grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {currentRound?.matches.map(match => {
            const isPlayer = match.isPlayerMatch;
            const winner = match.winner;
            const winnerName = getMatchWinner(match);
            const isActive = simulating && match.id === activeMatchId;
            const isCompleted = !!winner;
            const cardClassName = `rounded-xl border-2 p-2.5 md:p-4 transition-all md:flex md:flex-col md:justify-center w-full text-left ${
              isActive
                ? 'border-[#3498DB] bg-[#3498DB]/10 shadow-[0_0_20px_rgba(52,152,219,0.15)]'
                : isPlayer && !winner
                ? 'border-[#C9A84C] bg-[#C9A84C]/5 shadow-[0_0_20px_rgba(201,168,76,0.1)]'
                : winner
                ? 'border-[#1E2740] bg-[#0D111F] opacity-60 hover:opacity-90 hover:border-[#C9A84C]/40 cursor-pointer active:scale-[0.99]'
                : 'border-[#1E2740] bg-[#141B2D]'
            }`;

            const cardContent = (
              <>
                <div className="flex items-start gap-2 md:gap-3">
                  <div className={`flex-1 min-w-0 space-y-1 md:space-y-1.5 ${winner === 'red' ? 'opacity-40' : ''}`}>
                    <span className={`block text-xs md:text-sm font-bold leading-snug line-clamp-2 ${
                      isHumanTeamId(match.teamA.id) ? 'text-[#C9A84C]' : 'text-[#F0E6D2]'
                    }`}>
                      {match.teamA.name}
                    </span>
                    <div className="flex flex-wrap gap-0.5 md:gap-1">
                      {match.teamA.champions.slice(0, 5).map(c => {
                        const def = CHAMPIONS.find(ch => ch.id === c.defId);
                        return def?.image ? (
                          <img
                            key={c.defId}
                            src={def.image}
                            alt={def.name}
                            title={def.name}
                            className="w-5 h-5 md:w-8 md:h-8 rounded-full border border-[#2A3550] object-cover shrink-0"
                          />
                        ) : (
                          <div
                            key={c.defId}
                            title={def?.name}
                            className="w-5 h-5 md:w-8 md:h-8 rounded-full border border-[#2A3550] flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                            style={{ backgroundColor: def?.color || '#333' }}
                          >
                            <User className="w-3 h-3" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mx-0.5 pt-5 md:pt-6 flex-shrink-0">
                    {winner ? (
                      <Trophy className="w-4 h-4 md:w-5 md:h-5 text-[#C9A84C]" />
                    ) : (
                      <span className="text-[#8B9BB4] text-[10px] md:text-xs font-bold">VS</span>
                    )}
                  </div>

                  <div className={`flex-1 min-w-0 space-y-1.5 text-right ${winner === 'blue' ? 'opacity-40' : ''}`}>
                    <span className={`block text-xs md:text-sm font-bold leading-snug line-clamp-2 ${
                      isHumanTeamId(match.teamB.id) ? 'text-[#C9A84C]' : 'text-[#F0E6D2]'
                    }`}>
                      {match.teamB.name}
                    </span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {match.teamB.champions.slice(0, 5).map(c => {
                        const def = CHAMPIONS.find(ch => ch.id === c.defId);
                        return def?.image ? (
                          <img
                            key={c.defId}
                            src={def.image}
                            alt={def.name}
                            title={def.name}
                            className="w-5 h-5 md:w-8 md:h-8 rounded-full border border-[#2A3550] object-cover shrink-0"
                          />
                        ) : (
                          <div
                            key={c.defId}
                            title={def?.name}
                            className="w-5 h-5 md:w-8 md:h-8 rounded-full border border-[#2A3550] flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                            style={{ backgroundColor: def?.color || '#333' }}
                          >
                            <User className="w-3 h-3" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {winner ? (
                  <div className="mt-3 md:mt-4 w-full text-center pointer-events-none">
                    <p className="text-[#C9A84C] text-xs md:text-sm font-bold">
                      Ganador: {winnerName}
                    </p>
                    <p className="text-[10px] text-[#8B9BB4] mt-0.5">
                      Ver resumen
                    </p>
                  </div>
                ) : isActive ? (
                  <p className="text-center text-[#3498DB] text-xs md:text-sm mt-3 md:mt-4 font-bold animate-pulse">
                    En disputa…
                  </p>
                ) : isPlayer ? (
                  <button
                    type="button"
                    onClick={() => handleStartMatch(match.id)}
                    disabled={simulating}
                    className="w-full mt-3 md:mt-4 min-h-11 md:min-h-12 bg-gradient-to-r from-[#C9A84C] to-[#B8953E] text-[#0A0E1A] font-bold py-3 rounded-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
                  >
                    <Swords className="w-4 h-4" />
                    {matchButtonLabel(match)}
                  </button>
                ) : (
                  <p className="text-center text-[#4A5570] text-xs md:text-sm mt-3 md:mt-4">
                    En espera…
                  </p>
                )}
              </>
            );

            if (isCompleted) {
              return (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => handleOpenSummary(match)}
                  className={cardClassName}
                  aria-label={`Ver resumen: ${match.teamA.name} vs ${match.teamB.name}`}
                >
                  {cardContent}
                </button>
              );
            }

            return (
              <div key={match.id} className={cardClassName}>
                {cardContent}
              </div>
            );
          })}
        </div>

        {!playerMatch && currentRound?.matches.every(m => m.winner !== null) && (
          <button
            type="button"
            onClick={handleAdvance}
            className="w-full mt-4 shrink-0 bg-gradient-to-r from-[#C9A84C] to-[#B8953E] text-[#0A0E1A] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-[0_4px_20px_rgba(201,168,76,0.3)]"
          >
            AVANZAR RONDA
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {selectedMatch && (
        <BracketMatchModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}
    </div>
  );
}
