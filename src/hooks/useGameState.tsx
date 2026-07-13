import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { GameScreen, Champion, TeamData, Tournament, Match, SimulationSnapshot, BuffId } from '@/types/game';
import { GameEngine, createTeam, simulateAIMatch } from '@/lib/game-engine';
import { CHAMPIONS, AI_TEAM_NAMES, getChampionBaseStats, RIVAL_TEAM_ID, RIVAL_TEAM_NAME } from '@/lib/game-data';
import { playVictorySound } from '@/lib/sounds';

// ========== STATE ==========

interface GameState {
  currentScreen: GameScreen;
  playerTeamName: string;
  selectedChampions: Champion[];
  tournament: Tournament | null;
  currentMatch: Match | null;
  simulationSnapshot: SimulationSnapshot | null;
  simulationEngine: GameEngine | null;
  pendingItemChampion: Champion | null;
  pendingItemQueue: Champion[];
  pendingItemIndex: number;
  pendingItemTotal: number;
  matchResult: 'win' | 'lose' | null;
  selectedBuffId: BuffId | null;
  defeatedRival: boolean;
}

const initialState: GameState = {
  currentScreen: 'home',
  playerTeamName: '',
  selectedChampions: [],
  tournament: null,
  currentMatch: null,
  simulationSnapshot: null,
  simulationEngine: null,
  pendingItemChampion: null,
  pendingItemQueue: [],
  pendingItemIndex: 0,
  pendingItemTotal: 0,
  matchResult: null,
  selectedBuffId: null,
  defeatedRival: false,
};

// ========== ACTIONS ==========

type GameAction =
  | { type: 'SET_SCREEN'; screen: GameScreen }
  | { type: 'SET_TEAM_NAME'; name: string }
  | { type: 'SELECT_CHAMPION'; defId: string }
  | { type: 'DESELECT_CHAMPION'; defId: string }
  | { type: 'CONFIRM_TEAM' }
  | { type: 'GENERATE_TOURNAMENT' }
  | { type: 'PREPARE_MATCH'; matchId: string }
  | { type: 'SELECT_BUFF'; buffId: BuffId }
  | { type: 'START_MATCH_WITH_BUFF' }
  | { type: 'SIMULATION_STEP'; snapshot: SimulationSnapshot }
  | { type: 'PAUSE_FOR_ITEM'; champion: Champion }
  | { type: 'PAUSE_FOR_ITEM_DRAFT'; champions: Champion[] }
  | { type: 'SELECT_ITEM'; championInstanceId: string; itemDefId: string; replaceIndex?: number }
  | { type: 'RESUME_SIMULATION' }
  | { type: 'MATCH_END'; result: 'win' | 'lose' }
  | { type: 'ADVANCE_BRACKET' }
  | { type: 'SIMULATE_ONE_AI_MATCH' }
  | { type: 'RESET_TOURNAMENT' };

function generateAIChampions(): string[] {
  const roles = ['top', 'jungle', 'mid', 'adc', 'support'] as const;
  const selected: string[] = [];
  for (const role of roles) {
    const available = CHAMPIONS.filter(c => c.role === role);
    const pick = available[Math.floor(Math.random() * available.length)];
    selected.push(pick.id);
  }
  return selected;
}

/** Equipo rival fijo: picks agresivos. */
function generateRivalChampions(): string[] {
  return ['darius', 'kayn', 'zed', 'kaisa', 'thresh'];
}

function buildRewards(beatRival: boolean, roundName: string): { titles: string[]; frame: Tournament['championFrame'] } {
  const titles = ['Campeón de la Grieta'];
  if (beatRival) titles.push('Cazador de Sombras');
  if (roundName === 'Final' || beatRival) titles.push('Estrella del Bracket');
  return {
    titles,
    frame: beatRival ? 'obsidian' : 'gold',
  };
}

function generateTournament(playerTeam: TeamData): Tournament {
  const teams: TeamData[] = [playerTeam];
  const rival = createTeam(RIVAL_TEAM_ID, RIVAL_TEAM_NAME, 'red', generateRivalChampions());
  teams.push(rival);

  for (let i = 0; i < 14; i++) {
    const champIds = generateAIChampions();
    const name = AI_TEAM_NAMES[i] || `Equipo ${i + 1}`;
    teams.push(createTeam(`ai_${i}`, name, 'red', champIds));
  }

  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  // Preferir que el rival no quede en el mismo match del jugador en octavos si posible
  // (pero que exista siempre en el bracket)
  const round1Matches: Match[] = [];
  for (let i = 0; i < 8; i++) {
    let teamA = shuffled[i * 2];
    let teamB = shuffled[i * 2 + 1];
    if (teamB.id === playerTeam.id) {
      [teamA, teamB] = [teamB, teamA];
    }
    const isPlayerMatch = teamA.id === playerTeam.id || teamB.id === playerTeam.id;
    round1Matches.push({
      id: `r1_m${i}`,
      round: 0,
      roundName: 'Octavos',
      teamA, teamB,
      winner: null,
      events: [],
      isPlayerMatch,
      isSimulated: false,
    });
  }

  return {
    rounds: [
      { round: 0, roundName: 'Octavos', matches: round1Matches },
      { round: 1, roundName: 'Cuartos', matches: [] },
      { round: 2, roundName: 'Semifinal', matches: [] },
      { round: 3, roundName: 'Final', matches: [] },
    ],
    playerTeam,
    currentRound: 0,
    isComplete: false,
    champion: null,
    rivalTeamId: RIVAL_TEAM_ID,
    titles: [],
    championFrame: 'none',
  };
}

function matchInvolvesRival(match: Match, rivalId: string) {
  return match.teamA.id === rivalId || match.teamB.id === rivalId;
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.screen };

    case 'SET_TEAM_NAME':
      return { ...state, playerTeamName: action.name };

    case 'SELECT_CHAMPION': {
      const def = CHAMPIONS.find(c => c.id === action.defId);
      if (!def) return state;
      if (state.selectedChampions.some(c => c.defId === action.defId)) return state;

      const withoutSameRole = state.selectedChampions.filter(c => {
        const cd = CHAMPIONS.find(x => x.id === c.defId);
        return cd?.role !== def.role;
      });

      const newChamp: Champion = {
        instanceId: `p_${action.defId}`,
        defId: action.defId,
        team: 'blue',
        stats: getChampionBaseStats(action.defId),
        items: [],
        isAlive: true,
        respawnTimer: 0,
        kills: 0,
        position: { lane: 0, x: 0 },
      };
      return { ...state, selectedChampions: [...withoutSameRole, newChamp] };
    }

    case 'DESELECT_CHAMPION':
      return { ...state, selectedChampions: state.selectedChampions.filter(c => c.defId !== action.defId) };

    case 'CONFIRM_TEAM':
    case 'GENERATE_TOURNAMENT': {
      if (state.selectedChampions.length !== 5) return state;
      const playerTeam = createTeam(
        'player',
        state.playerTeamName || 'Mi Equipo',
        'blue',
        state.selectedChampions.map(c => c.defId)
      );
      const tournament = generateTournament(playerTeam);
      return { ...state, tournament, currentScreen: 'bracket', defeatedRival: false };
    }

    case 'PREPARE_MATCH': {
      if (!state.tournament) return state;
      const round = state.tournament.rounds[state.tournament.currentRound];
      const match = round.matches.find(m => m.id === action.matchId);
      if (!match) return state;
      return {
        ...state,
        currentMatch: match,
        selectedBuffId: null,
        currentScreen: 'buffSelect',
        matchResult: null,
      };
    }

    case 'SELECT_BUFF':
      return { ...state, selectedBuffId: action.buffId };

    case 'START_MATCH_WITH_BUFF': {
      if (!state.currentMatch || !state.selectedBuffId) return state;
      const match = state.currentMatch;
      const engine = new GameEngine(match.teamA, match.teamB, state.selectedBuffId);
      const snapshot = engine.getInitialSnapshot();
      return {
        ...state,
        simulationEngine: engine,
        simulationSnapshot: snapshot,
        currentScreen: 'simulation',
        pendingItemChampion: null,
        pendingItemQueue: [],
        pendingItemIndex: 0,
        pendingItemTotal: 0,
        matchResult: null,
      };
    }

    case 'SIMULATION_STEP':
      return { ...state, simulationSnapshot: action.snapshot };

    case 'PAUSE_FOR_ITEM':
      return { ...state, pendingItemChampion: action.champion, pendingItemQueue: [], pendingItemIndex: 1, pendingItemTotal: 1, currentScreen: 'itemSelect' };

    case 'PAUSE_FOR_ITEM_DRAFT': {
      const eligible = action.champions.filter(c => c.items.length < 6);
      const [first, ...rest] = eligible;
      if (!first) return { ...state, currentScreen: 'simulation' };
      return {
        ...state,
        pendingItemChampion: first,
        pendingItemQueue: rest,
        pendingItemIndex: 1,
        pendingItemTotal: eligible.length,
        currentScreen: 'itemSelect',
      };
    }

    case 'SELECT_ITEM': {
      if (!state.simulationEngine) return state;
      state.simulationEngine.equipItem(action.championInstanceId, action.itemDefId, action.replaceIndex);
      const snapshot = state.simulationEngine.getInitialSnapshot();

      if (state.pendingItemQueue.length > 0) {
        const remaining = state.pendingItemQueue.filter(c => {
          const fresh = snapshot.champions.find(x => x.instanceId === c.instanceId);
          return (fresh?.items.length ?? c.items.length) < 6;
        });
        if (remaining.length > 0) {
          const [next, ...rest] = remaining;
          const nextFresh = snapshot.champions.find(c => c.instanceId === next.instanceId) ?? next;
          return {
            ...state,
            simulationSnapshot: snapshot,
            pendingItemChampion: nextFresh,
            pendingItemQueue: rest,
            pendingItemIndex: state.pendingItemIndex + 1,
            currentScreen: 'itemSelect',
          };
        }
      }

      return {
        ...state,
        simulationSnapshot: snapshot,
        pendingItemChampion: null,
        pendingItemQueue: [],
        pendingItemIndex: 0,
        pendingItemTotal: 0,
        currentScreen: 'simulation',
      };
    }

    case 'RESUME_SIMULATION':
      return { ...state, currentScreen: 'simulation' };

    case 'MATCH_END': {
      let tournament = state.tournament;
      let defeatedRival = state.defeatedRival;
      if (tournament && state.currentMatch && state.simulationSnapshot?.winner) {
        const winner = state.simulationSnapshot.winner;
        const rounds = tournament.rounds.map((round, idx) => {
          if (idx !== tournament!.currentRound) return round;
          return {
            ...round,
            matches: round.matches.map(m =>
              m.id === state.currentMatch!.id ? { ...m, winner } : m
            ),
          };
        });
        tournament = { ...tournament, rounds };
        if (
          action.result === 'win'
          && matchInvolvesRival(state.currentMatch, tournament.rivalTeamId)
        ) {
          defeatedRival = true;
        }
      }
      if (action.result === 'win') playVictorySound();
      return {
        ...state,
        tournament,
        matchResult: action.result,
        defeatedRival,
        currentScreen: action.result === 'win' ? 'victory' : 'defeat',
      };
    }

    case 'ADVANCE_BRACKET': {
      if (!state.tournament) return state;
      const t = {
        ...state.tournament,
        rounds: state.tournament.rounds.map(r => ({ ...r, matches: [...r.matches] })),
      };
      const currentRoundIdx = t.currentRound;
      const round = t.rounds[currentRoundIdx];

      if (state.currentMatch) {
        const matchIndex = round.matches.findIndex(m => m.id === state.currentMatch!.id);
        const winner = state.simulationSnapshot?.winner ?? round.matches[matchIndex]?.winner;
        if (matchIndex >= 0 && winner) {
          round.matches[matchIndex] = { ...round.matches[matchIndex], winner };
        }
      }

      const allMatchesDone = round.matches.every(m => m.winner !== null);
      if (allMatchesDone) {
        if (currentRoundIdx >= 3) {
          const finalMatch = round.matches[0];
          const championTeam = finalMatch.winner === 'blue' ? finalMatch.teamA : finalMatch.teamB;
          const rewards = championTeam.id === 'player'
            ? buildRewards(state.defeatedRival, 'Final')
            : { titles: [] as string[], frame: 'none' as const };
          return {
            ...state,
            tournament: {
              ...t,
              isComplete: true,
              champion: championTeam,
              titles: rewards.titles,
              championFrame: rewards.frame,
            },
            currentScreen: 'tournamentWin',
            currentMatch: null,
            simulationEngine: null,
            simulationSnapshot: null,
          };
        }

        const winners: TeamData[] = round.matches.map(m =>
          m.winner === 'blue' ? m.teamA : m.teamB
        );
        const nextRound = t.rounds[currentRoundIdx + 1];
        nextRound.matches = [];
        for (let i = 0; i < winners.length / 2; i++) {
          let teamA = winners[i * 2];
          let teamB = winners[i * 2 + 1];
          if (teamB.id === 'player') {
            [teamA, teamB] = [teamB, teamA];
          }
          const isPlayerMatch = teamA.id === 'player' || teamB.id === 'player';
          nextRound.matches.push({
            id: `r${currentRoundIdx + 1}_m${i}`,
            round: currentRoundIdx + 1,
            roundName: nextRound.roundName,
            teamA,
            teamB,
            winner: null,
            events: [],
            isPlayerMatch,
            isSimulated: false,
          });
        }
        t.currentRound = currentRoundIdx + 1;
      }

      return {
        ...state,
        tournament: t,
        currentMatch: null,
        simulationEngine: null,
        simulationSnapshot: null,
        currentScreen: 'bracket',
        matchResult: null,
        selectedBuffId: null,
      };
    }

    case 'SIMULATE_ONE_AI_MATCH': {
      if (!state.tournament) return state;
      const rounds = state.tournament.rounds.map((round, idx) => {
        if (idx !== state.tournament!.currentRound) return round;
        const pendingIdx = round.matches.findIndex(m => !m.isPlayerMatch && m.winner === null);
        if (pendingIdx < 0) return round;
        const match = round.matches[pendingIdx];
        const result = simulateAIMatch(match.teamA, match.teamB);
        return {
          ...round,
          matches: round.matches.map((m, i) =>
            i === pendingIdx ? { ...m, winner: result.winner, isSimulated: true } : m
          ),
        };
      });
      return { ...state, tournament: { ...state.tournament, rounds } };
    }

    case 'RESET_TOURNAMENT':
      return { ...initialState, currentScreen: 'home' };

    default:
      return state;
  }
}

// ========== CONTEXT ==========

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  startSimulationStep: () => 'continue' | 'items' | 'ended';
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const startSimulationStep = useCallback((): 'continue' | 'items' | 'ended' => {
    if (!state.simulationEngine) return 'ended';
    const snapshot = state.simulationEngine.step();
    dispatch({ type: 'SIMULATION_STEP', snapshot });

    if (snapshot.isComplete) {
      const result = snapshot.winner === 'blue' ? 'win' : 'lose';
      dispatch({ type: 'MATCH_END', result });
      return 'ended';
    }

    if (snapshot.step > 0 && snapshot.step % 2 === 0) {
      const blueChamps = snapshot.champions.filter(
        c => c.team === 'blue' && c.items.length < 6
      );
      if (blueChamps.length > 0) {
        dispatch({ type: 'PAUSE_FOR_ITEM_DRAFT', champions: blueChamps });
        return 'items';
      }
    }

    return 'continue';
  }, [state.simulationEngine]);

  return (
    <GameContext.Provider value={{ state, dispatch, startSimulationStep }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
