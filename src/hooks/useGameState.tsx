import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { GameScreen, Champion, TeamData, Tournament, Match, SimulationSnapshot } from '@/types/game';
import { GameEngine, createTeam, simulateAIMatch } from '@/lib/game-engine';
import { CHAMPIONS, AI_TEAM_NAMES } from '@/lib/game-data';

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
};

// ========== ACTIONS ==========

type GameAction =
  | { type: 'SET_SCREEN'; screen: GameScreen }
  | { type: 'SET_TEAM_NAME'; name: string }
  | { type: 'SELECT_CHAMPION'; defId: string }
  | { type: 'DESELECT_CHAMPION'; defId: string }
  | { type: 'CONFIRM_TEAM' }
  | { type: 'GENERATE_TOURNAMENT' }
  | { type: 'START_MATCH'; matchId: string }
  | { type: 'SIMULATION_STEP'; snapshot: SimulationSnapshot }
  | { type: 'PAUSE_FOR_ITEM'; champion: Champion }
  | { type: 'PAUSE_FOR_ITEM_DRAFT'; champions: Champion[] }
  | { type: 'SELECT_ITEM'; championInstanceId: string; itemDefId: string; replaceIndex?: number }
  | { type: 'RESUME_SIMULATION' }
  | { type: 'MATCH_END'; result: 'win' | 'lose' }
  | { type: 'ADVANCE_BRACKET' }
  | { type: 'SIMULATE_AI_MATCHES' }
  | { type: 'RESET_TOURNAMENT' };

// ========== REDUCER ==========

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

function generateTournament(playerTeam: TeamData): Tournament {
  const teams: TeamData[] = [playerTeam];

  for (let i = 0; i < 15; i++) {
    const champIds = generateAIChampions();
    teams.push(createTeam(`ai_${i}`, AI_TEAM_NAMES[i], 'red', champIds));
  }

  // Shuffle and create bracket (first round: 8 matches)
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const round1Matches: Match[] = [];
  for (let i = 0; i < 8; i++) {
    let teamA = shuffled[i * 2];
    let teamB = shuffled[i * 2 + 1];
    // Player always as teamA so blue/red mapping matches simulation
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
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.screen };

    case 'SET_TEAM_NAME':
      return { ...state, playerTeamName: action.name };

    case 'SELECT_CHAMPION': {
      if (state.selectedChampions.length >= 5) return state;
      const def = CHAMPIONS.find(c => c.id === action.defId);
      if (!def) return state;
      // Check if role already selected
      const roleAlreadySelected = state.selectedChampions.some(c => {
        const cd = CHAMPIONS.find(x => x.id === c.defId);
        return cd?.role === def.role;
      });
      if (roleAlreadySelected) return state;
      // Check if already selected
      if (state.selectedChampions.some(c => c.defId === action.defId)) return state;

      const newChamp: Champion = {
        instanceId: `p_${action.defId}`,
        defId: action.defId,
        team: 'blue',
        stats: {
          hp: 800, maxHp: 800, mana: 300, maxMana: 300,
          ad: 60, ap: 0, attackSpeed: 0.8, armor: 30, mr: 30, moveSpeed: 100,
        },
        items: [],
        isAlive: true,
        respawnTimer: 0,
        kills: 0,
        position: { lane: 0, x: 0 },
      };
      return { ...state, selectedChampions: [...state.selectedChampions, newChamp] };
    }

    case 'DESELECT_CHAMPION':
      return { ...state, selectedChampions: state.selectedChampions.filter(c => c.defId !== action.defId) };

    case 'CONFIRM_TEAM': {
      if (state.selectedChampions.length !== 5) return state;
      const playerTeam = createTeam(
        'player',
        state.playerTeamName || 'Mi Equipo',
        'blue',
        state.selectedChampions.map(c => c.defId)
      );
      const tournament = generateTournament(playerTeam);
      return { ...state, tournament, currentScreen: 'bracket' };
    }

    case 'GENERATE_TOURNAMENT': {
      const champIds = state.selectedChampions.map(c => c.defId);
      if (champIds.length !== 5) return state;
      const playerTeam = createTeam('player', state.playerTeamName || 'Mi Equipo', 'blue', champIds);
      const tournament = generateTournament(playerTeam);
      return { ...state, tournament, currentScreen: 'bracket' };
    }

    case 'START_MATCH': {
      if (!state.tournament) return state;
      const round = state.tournament.rounds[state.tournament.currentRound];
      const match = round.matches.find(m => m.id === action.matchId);
      if (!match) return state;

      const engine = new GameEngine(match.teamA, match.teamB);
      const snapshot = engine.getInitialSnapshot();
      return {
        ...state,
        currentMatch: match,
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
      if (tournament && state.currentMatch && state.simulationSnapshot?.winner) {
        const rounds = tournament.rounds.map((round, idx) => {
          if (idx !== tournament!.currentRound) return round;
          return {
            ...round,
            matches: round.matches.map(m =>
              m.id === state.currentMatch!.id
                ? { ...m, winner: state.simulationSnapshot!.winner }
                : m
            ),
          };
        });
        tournament = { ...tournament, rounds };
      }
      return {
        ...state,
        tournament,
        matchResult: action.result,
        currentScreen: action.result === 'win' ? 'victory' : 'defeat',
      };
    }

    case 'ADVANCE_BRACKET': {
      if (!state.tournament || !state.currentMatch || !state.simulationSnapshot) return state;
      const t = { ...state.tournament };
      const currentRoundIdx = t.currentRound;

      // Update winner of current match
      const round = t.rounds[currentRoundIdx];
      const matchIndex = round.matches.findIndex(m => m.id === state.currentMatch!.id);
      if (matchIndex >= 0) {
        const winner = state.simulationSnapshot.winner;
        round.matches[matchIndex] = {
          ...round.matches[matchIndex],
          winner,
        };
      }

      // Check if round is complete
      const allMatchesDone = round.matches.every(m => m.winner !== null);
      if (allMatchesDone) {
        if (currentRoundIdx >= 3) {
          // Tournament complete
          const finalMatch = round.matches[0];
          const championTeam = finalMatch.winner === 'blue' ? finalMatch.teamA : finalMatch.teamB;
          return {
            ...state,
            tournament: {
              ...t,
              isComplete: true,
              champion: championTeam,
            },
            currentScreen: 'tournamentWin',
            currentMatch: null,
            simulationEngine: null,
            simulationSnapshot: null,
          };
        }

        // Generate next round
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
      };
    }

    case 'SIMULATE_AI_MATCHES': {
      if (!state.tournament) return state;
      const t = { ...state.tournament };
      const round = t.rounds[t.currentRound];

      for (const match of round.matches) {
        if (match.isPlayerMatch || match.winner !== null) continue;
        const result = simulateAIMatch(match.teamA, match.teamB);
        match.winner = result.winner;
      }

      return { ...state, tournament: t };
    }

    case 'RESET_TOURNAMENT':
      return {
        ...initialState,
        currentScreen: 'home',
      };

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

    // Match ended takes priority
    if (snapshot.isComplete) {
      const result = snapshot.winner === 'blue' ? 'win' : 'lose';
      dispatch({ type: 'MATCH_END', result });
      return 'ended';
    }

    // Every 2 turns: pick items only for champions still under 6
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
