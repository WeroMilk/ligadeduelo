import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type {
  GameScreen, Champion, TeamData, Tournament, Match, BuffId, TeamPlan, TurnMatchState, CombatAction, LaneId,
} from '@/types/game';
import { createTeam, simulateAIMatch } from '@/lib/game-engine';
import {
  createTurnMatch, createTurnTeam, resolveRound, generateAIPlan, buyItem, aiBuyItems, champDef,
} from '@/lib/turn-engine';
import { CHAMPIONS, AI_TEAM_NAMES, getChampionBaseStats, RIVAL_TEAM_ID, RIVAL_TEAM_NAME } from '@/lib/game-data';

interface GameState {
  currentScreen: GameScreen;
  playerTeamName: string;
  selectedChampions: Champion[];
  tournament: Tournament | null;
  currentMatch: Match | null;
  turnMatch: TurnMatchState | null;
  playerPlan: TeamPlan;
  enemyPlanPreview: TeamPlan | null;
  ahriPeekAction: CombatAction | null;
  shopQueue: Champion[];
  matchResult: 'win' | 'lose' | null;
  selectedBuffId: BuffId | null;
  defeatedRival: boolean;
}

const emptyPlan = (): TeamPlan => ({ actions: {}, ultimates: [], bootsLane: {}, jungleTarget: 1 });

const initialState: GameState = {
  currentScreen: 'home',
  playerTeamName: '',
  selectedChampions: [],
  tournament: null,
  currentMatch: null,
  turnMatch: null,
  playerPlan: emptyPlan(),
  enemyPlanPreview: null,
  ahriPeekAction: null,
  shopQueue: [],
  matchResult: null,
  selectedBuffId: null,
  defeatedRival: false,
};

type GameAction =
  | { type: 'SET_SCREEN'; screen: GameScreen }
  | { type: 'SET_TEAM_NAME'; name: string }
  | { type: 'SELECT_CHAMPION'; defId: string }
  | { type: 'DESELECT_CHAMPION'; defId: string }
  | { type: 'CONFIRM_TEAM' }
  | { type: 'PREPARE_MATCH'; matchId: string }
  | { type: 'SELECT_BUFF'; buffId: BuffId }
  | { type: 'START_MATCH_WITH_BUFF' }
  | { type: 'SET_PLAN_ACTION'; instanceId: string; action: CombatAction }
  | { type: 'TOGGLE_ULTIMATE'; instanceId: string }
  | { type: 'SET_JUNGLE_TARGET'; target: LaneId | 'objective' }
  | { type: 'SET_BOOTS_LANE'; instanceId: string; lane: LaneId }
  | { type: 'CONFIRM_PLAN' }
  | { type: 'CONTINUE_AFTER_RESOLVE' }
  | { type: 'BUY_ITEM'; instanceId: string; itemId: string }
  | { type: 'SKIP_SHOP_CHAMP' }
  | { type: 'FINISH_SHOP' }
  | { type: 'MATCH_END'; result: 'win' | 'lose' }
  | { type: 'ADVANCE_BRACKET' }
  | { type: 'SIMULATE_ONE_AI_MATCH' }
  | { type: 'RESET_TOURNAMENT' };

function generateAIChampions(): string[] {
  const roles = ['top', 'jungle', 'mid', 'adc', 'support'] as const;
  return roles.map(role => {
    const available = CHAMPIONS.filter(c => c.role === role);
    return available[Math.floor(Math.random() * available.length)].id;
  });
}

function generateRivalChampions(): string[] {
  return ['darius', 'kayn', 'zed', 'kaisa', 'thresh'];
}

function buildRewards(beatRival: boolean): { titles: string[]; frame: Tournament['championFrame'] } {
  const titles = ['Campeón de la Grieta'];
  if (beatRival) titles.push('Cazador de Sombras');
  titles.push('Estrella del Bracket');
  return { titles, frame: beatRival ? 'obsidian' : 'gold' };
}

function generateTournament(playerTeam: TeamData): Tournament {
  const teams: TeamData[] = [playerTeam];
  teams.push(createTeam(RIVAL_TEAM_ID, RIVAL_TEAM_NAME, 'red', generateRivalChampions()));
  for (let i = 0; i < 14; i++) {
    teams.push(createTeam(`ai_${i}`, AI_TEAM_NAMES[i] || `Equipo ${i + 1}`, 'red', generateAIChampions()));
  }
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const round1Matches: Match[] = [];
  for (let i = 0; i < 8; i++) {
    let teamA = shuffled[i * 2];
    let teamB = shuffled[i * 2 + 1];
    if (teamB.id === playerTeam.id) [teamA, teamB] = [teamB, teamA];
    round1Matches.push({
      id: `r1_m${i}`,
      round: 0,
      roundName: 'Octavos',
      teamA,
      teamB,
      winner: null,
      isPlayerMatch: teamA.id === playerTeam.id || teamB.id === playerTeam.id,
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

function defaultPlayerPlan(state: TurnMatchState): TeamPlan {
  const plan = emptyPlan();
  for (const c of state.blue.champions.filter(x => x.isAlive)) {
    const def = champDef(c);
    if (def.role === 'jungle') plan.jungleTarget = 1;
  }
  return plan;
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
        gold: 100,
        tearStacks: 0,
        burnPending: 0,
        ultimateUsed: false,
        siegeStacks: 0,
      };
      return { ...state, selectedChampions: [...withoutSameRole, newChamp] };
    }
    case 'DESELECT_CHAMPION':
      return { ...state, selectedChampions: state.selectedChampions.filter(c => c.defId !== action.defId) };

    case 'CONFIRM_TEAM': {
      if (state.selectedChampions.length !== 5) return state;
      const playerTeam = createTeam('player', state.playerTeamName || 'Mi Equipo', 'blue', state.selectedChampions.map(c => c.defId));
      return { ...state, tournament: generateTournament(playerTeam), currentScreen: 'bracket', defeatedRival: false };
    }

    case 'PREPARE_MATCH': {
      if (!state.tournament) return state;
      const round = state.tournament.rounds[state.tournament.currentRound];
      const match = round.matches.find(m => m.id === action.matchId);
      if (!match) return state;
      return { ...state, currentMatch: match, selectedBuffId: null, currentScreen: 'buffSelect', matchResult: null };
    }

    case 'SELECT_BUFF':
      return { ...state, selectedBuffId: action.buffId };

    case 'START_MATCH_WITH_BUFF': {
      if (!state.currentMatch || !state.selectedBuffId) return state;
      const m = state.currentMatch;
      const blue = createTurnTeam(m.teamA.id, m.teamA.name, 'blue', m.teamA.champions.map(c => c.defId));
      const red = createTurnTeam(m.teamB.id, m.teamB.name, 'red', m.teamB.champions.map(c => c.defId));
      const turnMatch = createTurnMatch(blue, red, state.selectedBuffId);
      return {
        ...state,
        turnMatch,
        playerPlan: defaultPlayerPlan(turnMatch),
        enemyPlanPreview: null,
        ahriPeekAction: null,
        currentScreen: 'planPhase',
      };
    }

    case 'SET_PLAN_ACTION':
      return {
        ...state,
        playerPlan: {
          ...state.playerPlan,
          actions: { ...state.playerPlan.actions, [action.instanceId]: action.action },
        },
      };

    case 'TOGGLE_ULTIMATE': {
      const c = state.turnMatch?.blue.champions.find(x => x.instanceId === action.instanceId);
      if (!c || c.ultimateUsed) return state;
      const has = state.playerPlan.ultimates.includes(action.instanceId);
      const ultimates = has
        ? state.playerPlan.ultimates.filter(id => id !== action.instanceId)
        : [...state.playerPlan.ultimates, action.instanceId];

      let ahriPeekAction = state.ahriPeekAction;
      let enemyPlanPreview = state.enemyPlanPreview;
      // Ahri charm peek
      if (!has && c.defId === 'ahri' && state.turnMatch) {
        enemyPlanPreview = generateAIPlan(state.turnMatch, 'red');
        const mid = state.turnMatch.red.champions.find(x => champDef(x).role === 'mid' && x.isAlive);
        ahriPeekAction = mid ? (enemyPlanPreview.actions[mid.instanceId] || 'attack') : null;
      }
      if (has && c.defId === 'ahri') {
        ahriPeekAction = null;
      }

      return { ...state, playerPlan: { ...state.playerPlan, ultimates }, ahriPeekAction, enemyPlanPreview };
    }

    case 'SET_JUNGLE_TARGET':
      return { ...state, playerPlan: { ...state.playerPlan, jungleTarget: action.target } };

    case 'SET_BOOTS_LANE':
      return {
        ...state,
        playerPlan: {
          ...state.playerPlan,
          bootsLane: { ...state.playerPlan.bootsLane, [action.instanceId]: action.lane },
        },
      };

    case 'CONFIRM_PLAN': {
      if (!state.turnMatch) return state;
      const redPlan = state.enemyPlanPreview || generateAIPlan(state.turnMatch, 'red');
      const resolved = resolveRound(state.turnMatch, state.playerPlan, redPlan);
      return {
        ...state,
        turnMatch: resolved,
        enemyPlanPreview: redPlan,
        currentScreen: 'resolvePhase',
        ahriPeekAction: null,
      };
    }

    case 'CONTINUE_AFTER_RESOLVE': {
      if (!state.turnMatch) return state;
      if (state.turnMatch.isComplete) {
        const result = state.turnMatch.winner === 'blue' ? 'win' : 'lose';
        let defeatedRival = state.defeatedRival;
        let tournament = state.tournament;
        if (tournament && state.currentMatch) {
          const winner = state.turnMatch.winner;
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
          if (result === 'win' && matchInvolvesRival(state.currentMatch, tournament.rivalTeamId)) {
            defeatedRival = true;
          }
        }
        return {
          ...state,
          tournament,
          defeatedRival,
          matchResult: result,
          currentScreen: result === 'win' ? 'victory' : 'defeat',
        };
      }
      // Shop queue: alive blue champs under 6 items
      const queue = state.turnMatch.blue.champions.filter(c => c.isAlive && c.items.length < 6 && c.gold >= 80);
      if (queue.length === 0) {
        aiBuyItems(state.turnMatch.red);
        return {
          ...state,
          turnMatch: { ...state.turnMatch, red: { ...state.turnMatch.red } },
          playerPlan: defaultPlayerPlan(state.turnMatch),
          enemyPlanPreview: null,
          currentScreen: 'planPhase',
        };
      }
      return { ...state, shopQueue: queue, currentScreen: 'shopPhase' };
    }

    case 'BUY_ITEM': {
      if (!state.turnMatch) return state;
      const tm = {
        ...state.turnMatch,
        blue: { ...state.turnMatch.blue, champions: state.turnMatch.blue.champions.map(c => ({ ...c, stats: { ...c.stats }, items: [...c.items] })) },
      };
      const champ = tm.blue.champions.find(c => c.instanceId === action.instanceId);
      if (!champ) return state;
      buyItem(champ, action.itemId);
      const rest = state.shopQueue.filter(c => c.instanceId !== action.instanceId);
      if (rest.length === 0) {
        aiBuyItems(tm.red);
        return {
          ...state,
          turnMatch: tm,
          shopQueue: [],
          playerPlan: defaultPlayerPlan(tm),
          enemyPlanPreview: null,
          currentScreen: 'planPhase',
        };
      }
      return { ...state, turnMatch: tm, shopQueue: rest };
    }

    case 'SKIP_SHOP_CHAMP': {
      if (state.shopQueue.length === 0) return state;
      const rest = state.shopQueue.slice(1);
      if (rest.length === 0 && state.turnMatch) {
        const tm = { ...state.turnMatch };
        aiBuyItems(tm.red);
        return {
          ...state,
          turnMatch: tm,
          shopQueue: [],
          playerPlan: defaultPlayerPlan(tm),
          enemyPlanPreview: null,
          currentScreen: 'planPhase',
        };
      }
      return { ...state, shopQueue: rest };
    }

    case 'FINISH_SHOP': {
      if (!state.turnMatch) return state;
      const tm = { ...state.turnMatch };
      aiBuyItems(tm.red);
      return {
        ...state,
        turnMatch: tm,
        shopQueue: [],
        playerPlan: defaultPlayerPlan(tm),
        enemyPlanPreview: null,
        currentScreen: 'planPhase',
      };
    }

    case 'MATCH_END':
      return {
        ...state,
        matchResult: action.result,
        currentScreen: action.result === 'win' ? 'victory' : 'defeat',
      };

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
        const winner = state.turnMatch?.winner ?? round.matches[matchIndex]?.winner;
        if (matchIndex >= 0 && winner) {
          round.matches[matchIndex] = { ...round.matches[matchIndex], winner };
        }
      }

      if (round.matches.every(m => m.winner !== null)) {
        if (currentRoundIdx >= 3) {
          const finalMatch = round.matches[0];
          const championTeam = finalMatch.winner === 'blue' ? finalMatch.teamA : finalMatch.teamB;
          const rewards = championTeam.id === 'player' ? buildRewards(state.defeatedRival) : { titles: [] as string[], frame: 'none' as const };
          return {
            ...state,
            tournament: { ...t, isComplete: true, champion: championTeam, titles: rewards.titles, championFrame: rewards.frame },
            currentScreen: 'tournamentWin',
            currentMatch: null,
            turnMatch: null,
          };
        }
        const winners: TeamData[] = round.matches.map(m => (m.winner === 'blue' ? m.teamA : m.teamB));
        const nextRound = t.rounds[currentRoundIdx + 1];
        nextRound.matches = [];
        for (let i = 0; i < winners.length / 2; i++) {
          let teamA = winners[i * 2];
          let teamB = winners[i * 2 + 1];
          if (teamB.id === 'player') [teamA, teamB] = [teamB, teamA];
          nextRound.matches.push({
            id: `r${currentRoundIdx + 1}_m${i}`,
            round: currentRoundIdx + 1,
            roundName: nextRound.roundName,
            teamA,
            teamB,
            winner: null,
            isPlayerMatch: teamA.id === 'player' || teamB.id === 'player',
            isSimulated: false,
          });
        }
        t.currentRound = currentRoundIdx + 1;
      }

      return {
        ...state,
        tournament: t,
        currentMatch: null,
        turnMatch: null,
        currentScreen: 'bracket',
        matchResult: null,
        selectedBuffId: null,
        playerPlan: emptyPlan(),
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

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
