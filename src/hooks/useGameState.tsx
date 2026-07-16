import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type {
  GameScreen, Champion, TeamData, Tournament, Match, TurnMatchState,
  GameMode, LobbyPlayer, RosterMember, TeamPlan, LaneId, TeamColor,
} from '@/types/game';
import { createTeam, simulateAIMatch } from '@/lib/game-engine';
import {
  createTurnMatch, createTurnTeam, resolveRound, generateAIPlan, aiBuyItems, finishPendingObjective,
} from '@/lib/turn-engine';
import { CHAMPIONS, AI_TEAM_NAMES, getChampionBaseStats } from '@/lib/game-data';

const emptyPlan = (): TeamPlan => ({ actions: {}, ultimates: [], bootsLane: {}, jungleTarget: 1 });

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

interface GameState {
  currentScreen: GameScreen;
  gameMode: GameMode | null;
  roomCode: string;
  lobbyPlayers: LobbyPlayer[];
  playerTeamName: string;
  selectedFanOrgId: string | null;
  selectedRoster: RosterMember[];
  selectedChampions: Champion[];
  /** champ defId -> roster member id */
  champToRoster: Record<string, string>;
  tournament: Tournament | null;
  currentMatch: Match | null;
  turnMatch: TurnMatchState | null;
  playerPlan: TeamPlan;
  enemyPlanPreview: TeamPlan | null;
  matchResult: 'win' | 'lose' | null;
  defeatedRival: boolean;
  /** Ronda en la que el jugador fue eliminado (0–3). null si sigue vivo / campeón. */
  playerEliminatedRound: number | null;
}

const initialState: GameState = {
  currentScreen: 'modeSelect',
  gameMode: null,
  roomCode: '',
  lobbyPlayers: [],
  playerTeamName: '',
  selectedFanOrgId: null,
  selectedRoster: [],
  selectedChampions: [],
  champToRoster: {},
  tournament: null,
  currentMatch: null,
  turnMatch: null,
  playerPlan: emptyPlan(),
  enemyPlanPreview: null,
  matchResult: null,
  defeatedRival: false,
  playerEliminatedRound: null,
};

type GameAction =
  | { type: 'SET_SCREEN'; screen: GameScreen }
  | { type: 'SET_GAME_MODE'; mode: GameMode }
  | { type: 'ADD_LOBBY_PLAYER'; name: string }
  | { type: 'REMOVE_LOBBY_PLAYER'; id: string }
  | { type: 'CONFIRM_LOBBY' }
  | { type: 'SET_TEAM_NAME'; name: string; orgId?: string }
  | { type: 'SELECT_ROSTER'; member: RosterMember }
  | { type: 'DESELECT_ROSTER'; memberId: string }
  | { type: 'CONFIRM_ROSTER' }
  | { type: 'SELECT_CHAMPION'; defId: string }
  | { type: 'DESELECT_CHAMPION'; defId: string }
  | { type: 'CONFIRM_TEAM' }
  | { type: 'PREPARE_MATCH'; matchId: string }
  | { type: 'SET_LIVE_PLAN'; plan: TeamPlan }
  | { type: 'RESOLVE_LIVE_ROUND'; plan: TeamPlan }
  | {
      type: 'RESOLVE_OBJECTIVE_QTE';
      qte: { skirmishWinner: TeamColor | null; attackingTeam: TeamColor; monsterTaken: boolean };
    }
  | { type: 'FINISH_LIVE_MATCH' }
  | { type: 'ADVANCE_BRACKET' }
  | { type: 'SIMULATE_ONE_AI_MATCH' }
  | { type: 'EXIT_TO_MODE' }
  | { type: 'RESET_TOURNAMENT' };

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function nameKey(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9áéíóúñ]/gi, '');
}

const ROLES = ['top', 'jungle', 'mid', 'adc', 'support'] as const;

/** Pools por rol: alineaciones distintas hasta agotar el pool (luego se regenera). */
function createChampPools(excludeDefIds: Set<string>): Record<(typeof ROLES)[number], string[]> {
  const pools = {} as Record<(typeof ROLES)[number], string[]>;
  for (const role of ROLES) {
    const ids = CHAMPIONS.filter(c => c.role === role && !excludeDefIds.has(c.id)).map(c => c.id);
    const fallback = CHAMPIONS.filter(c => c.role === role).map(c => c.id);
    pools[role] = shuffleInPlace(ids.length > 0 ? ids : [...fallback]);
  }
  return pools;
}

function drawLineup(pools: Record<(typeof ROLES)[number], string[]>): string[] {
  return ROLES.map(role => {
    if (pools[role].length === 0) {
      pools[role] = shuffleInPlace(CHAMPIONS.filter(c => c.role === role).map(c => c.id));
    }
    return pools[role].shift()!;
  });
}

function buildRewards(beatRival: boolean): { titles: string[]; frame: Tournament['championFrame'] } {
  const titles = ['Campeón de la Grieta'];
  if (beatRival) titles.push('Cazador de Rivales');
  titles.push('Estrella del Bracket');
  return { titles, frame: beatRival ? 'obsidian' : 'gold' };
}

function generateTournament(playerTeam: TeamData, lobbyPlayers: LobbyPlayer[], mode: GameMode | null): Tournament {
  void mode;
  const usedNames = new Set<string>([nameKey(playerTeam.name)]);
  const namePool = shuffleInPlace(
    AI_TEAM_NAMES.filter(n => !usedNames.has(nameKey(n))),
  );

  const playerChampIds = new Set(playerTeam.champions.map(c => c.defId));
  const champPools = createChampPools(playerChampIds);

  // Rival aleatorio (nombre + alineación distintos cada torneo)
  const rivalName = namePool.shift() || 'Rival Misterioso';
  usedNames.add(nameKey(rivalName));
  const rivalTeamId = `rival_${nameKey(rivalName) || 'x'}`;
  const rivalTeam = createTeam(rivalTeamId, rivalName, 'red', drawLineup(champPools));

  const teams: TeamData[] = [playerTeam, rivalTeam];

  const friendSlots = lobbyPlayers.filter(p => !p.isHost).slice(0, 14);
  for (let i = 0; i < friendSlots.length; i++) {
    const fname = friendSlots[i].name;
    usedNames.add(nameKey(fname));
    teams.push(createTeam(`friend_${i}`, fname, 'red', drawLineup(champPools)));
  }

  let aiIdx = 0;
  while (teams.length < 16) {
    let name = namePool.shift();
    if (!name) {
      name = `Equipo ${aiIdx + 1}`;
      while (usedNames.has(nameKey(name))) {
        aiIdx++;
        name = `Equipo ${aiIdx + 1}`;
      }
    }
    usedNames.add(nameKey(name));
    teams.push(createTeam(`ai_${aiIdx}`, name, 'red', drawLineup(champPools)));
    aiIdx++;
  }

  // Bracket aleatorio; jugador siempre en teamA de su partido
  const shuffled = shuffleInPlace([...teams]);
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
    rivalTeamId,
    rivalTeamName: rivalName,
    titles: [],
    championFrame: 'none',
  };
}

function matchInvolvesRival(match: Match, rivalId: string) {
  return match.teamA.id === rivalId || match.teamB.id === rivalId;
}

function resolveLiveWinner(turnMatch: TurnMatchState): 'blue' | 'red' {
  if (turnMatch.winner === 'blue' || turnMatch.winner === 'red') return turnMatch.winner;
  const fromRes = turnMatch.lastResolution?.winner;
  if (fromRes === 'blue' || fromRes === 'red') return fromRes;

  const nexusBlue = turnMatch.structures.find(s => s.id === 'nexus_blue');
  const nexusRed = turnMatch.structures.find(s => s.id === 'nexus_red');
  const redDead = !!nexusRed?.isDestroyed;
  const blueDead = !!nexusBlue?.isDestroyed;
  if (redDead && !blueDead) return 'blue';
  if (blueDead && !redDead) return 'red';

  if (turnMatch.blue.kills !== turnMatch.red.kills) {
    return turnMatch.blue.kills > turnMatch.red.kills ? 'blue' : 'red';
  }
  return turnMatch.blue.score >= turnMatch.red.score ? 'blue' : 'red';
}

function applyMatchEnd(state: GameState, turnMatch: TurnMatchState): GameState {
  const winner = resolveLiveWinner(turnMatch);
  const result = winner === 'blue' ? 'win' : 'lose';
  const sealed = { ...turnMatch, isComplete: true, winner };
  let defeatedRival = state.defeatedRival;
  let tournament = state.tournament;
  if (tournament && state.currentMatch) {
    const rounds = tournament.rounds.map((r, idx) => {
      if (idx !== tournament!.currentRound) return r;
      return {
        ...r,
        matches: r.matches.map(m =>
          m.id === state.currentMatch!.id ? { ...m, winner, isSimulated: false } : m
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
    turnMatch: sealed,
    tournament,
    defeatedRival,
    matchResult: result,
    playerEliminatedRound:
      result === 'lose' && state.tournament
        ? state.tournament.currentRound
        : state.playerEliminatedRound,
    currentScreen: result === 'win' ? 'victory' : 'defeat',
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.screen };

    case 'SET_GAME_MODE': {
      if (action.mode === 'ai') {
        return {
          ...state,
          gameMode: 'ai',
          roomCode: '',
          lobbyPlayers: [{ id: 'host', name: 'Tú', isHost: true }],
          currentScreen: 'home',
        };
      }
      if (action.mode === 'coop_local') {
        return {
          ...state,
          gameMode: 'coop_local',
          roomCode: '',
          lobbyPlayers: [{ id: 'host', name: 'Jugador 1', isHost: true }],
          currentScreen: 'lobby',
        };
      }
      return {
        ...state,
        gameMode: 'coop_code',
        roomCode: makeRoomCode(),
        lobbyPlayers: [{ id: 'host', name: 'Host', isHost: true }],
        currentScreen: 'lobby',
      };
    }

    case 'ADD_LOBBY_PLAYER': {
      if (state.lobbyPlayers.length >= 16) return state;
      const name = action.name.trim() || `Amigo ${state.lobbyPlayers.length}`;
      return {
        ...state,
        lobbyPlayers: [
          ...state.lobbyPlayers,
          { id: `p_${Date.now()}_${state.lobbyPlayers.length}`, name, isHost: false },
        ],
      };
    }

    case 'REMOVE_LOBBY_PLAYER':
      return {
        ...state,
        lobbyPlayers: state.lobbyPlayers.filter(p => p.id !== action.id || p.isHost),
      };

    case 'CONFIRM_LOBBY': {
      if (state.gameMode === 'coop_local' && state.lobbyPlayers.length < 2) return state;
      if (state.gameMode === 'coop_code' && state.lobbyPlayers.length < 2) return state;
      return { ...state, currentScreen: 'home' };
    }

    case 'SET_TEAM_NAME':
      return {
        ...state,
        playerTeamName: action.name,
        selectedFanOrgId: action.orgId ?? null,
      };

    case 'SELECT_ROSTER': {
      const m = action.member;
      if (state.selectedRoster.some(x => x.id === m.id)) return state;
      const withoutRole = state.selectedRoster.filter(x => x.role !== m.role);
      return { ...state, selectedRoster: [...withoutRole, m] };
    }

    case 'DESELECT_ROSTER':
      return {
        ...state,
        selectedRoster: state.selectedRoster.filter(x => x.id !== action.memberId),
      };

    case 'CONFIRM_ROSTER':
      if (state.selectedRoster.length !== 5) return state;
      return { ...state, currentScreen: 'championSelect', selectedChampions: [], champToRoster: {} };

    case 'SELECT_CHAMPION': {
      const def = CHAMPIONS.find(c => c.id === action.defId);
      if (!def) return state;
      if (state.selectedChampions.some(c => c.defId === action.defId)) return state;
      const withoutSameRole = state.selectedChampions.filter(c => {
        const cd = CHAMPIONS.find(x => x.id === c.defId);
        return cd?.role !== def.role;
      });
      const rosterMate = state.selectedRoster.find(r => r.role === def.role);
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
        lifeSteal: 0,
      };
      const champToRoster = { ...state.champToRoster };
      Object.keys(champToRoster).forEach(k => {
        const cd = CHAMPIONS.find(x => x.id === k);
        if (cd?.role === def.role) delete champToRoster[k];
      });
      if (rosterMate) champToRoster[action.defId] = rosterMate.id;
      return {
        ...state,
        selectedChampions: [...withoutSameRole, newChamp],
        champToRoster,
      };
    }

    case 'DESELECT_CHAMPION': {
      const nextMap = { ...state.champToRoster };
      delete nextMap[action.defId];
      return {
        ...state,
        selectedChampions: state.selectedChampions.filter(c => c.defId !== action.defId),
        champToRoster: nextMap,
      };
    }

    case 'CONFIRM_TEAM': {
      if (state.selectedChampions.length !== 5 || state.selectedRoster.length !== 5) return state;
      const playerTeam = createTeam(
        'player',
        state.playerTeamName || 'Mi Equipo',
        'blue',
        state.selectedChampions.map(c => c.defId),
      );
      return {
        ...state,
        tournament: generateTournament(playerTeam, state.lobbyPlayers, state.gameMode),
        currentScreen: 'bracket',
        defeatedRival: false,
        playerEliminatedRound: null,
      };
    }

    case 'PREPARE_MATCH': {
      if (!state.tournament) return state;
      const round = state.tournament.rounds[state.tournament.currentRound];
      const match = round.matches.find(m => m.id === action.matchId);
      if (!match) return state;
      const blue = createTurnTeam(match.teamA.id, match.teamA.name, 'blue', match.teamA.champions.map(c => c.defId));
      const red = createTurnTeam(match.teamB.id, match.teamB.name, 'red', match.teamB.champions.map(c => c.defId));
      const turnMatch = createTurnMatch(blue, red, null);
      return {
        ...state,
        currentMatch: match,
        turnMatch,
        matchResult: null,
        playerPlan: emptyPlan(),
        enemyPlanPreview: null,
        currentScreen: 'liveMatch',
      };
    }

    case 'SET_LIVE_PLAN':
      return { ...state, playerPlan: action.plan };

    case 'RESOLVE_LIVE_ROUND': {
      if (!state.turnMatch) return state;
      let tm = {
        ...state.turnMatch,
        blue: {
          ...state.turnMatch.blue,
          champions: state.turnMatch.blue.champions.map(c => ({
            ...c,
            stats: { ...c.stats },
            items: [...c.items],
          })),
        },
        red: {
          ...state.turnMatch.red,
          champions: state.turnMatch.red.champions.map(c => ({
            ...c,
            stats: { ...c.stats },
            items: [...c.items],
          })),
        },
        structures: state.turnMatch.structures.map(s => ({ ...s })),
      };
      aiBuyItems(tm.blue);
      aiBuyItems(tm.red);
      const redPlan = generateAIPlan(tm, 'red', action.plan);
      const resolved = resolveRound(tm, action.plan, redPlan);
      const next = {
        ...state,
        turnMatch: { ...resolved, pendingReward: false },
        playerPlan: action.plan,
        enemyPlanPreview: redPlan,
      };
      // Keep liveMatch open so cinema can play; FINISH_LIVE_MATCH ends after.
      return next;
    }

    case 'RESOLVE_OBJECTIVE_QTE': {
      if (!state.turnMatch?.pendingObjective) return state;
      const resolved = finishPendingObjective(state.turnMatch, action.qte);
      return {
        ...state,
        turnMatch: { ...resolved, pendingReward: false },
      };
    }

    case 'FINISH_LIVE_MATCH': {
      if (!state.turnMatch) return state;
      return applyMatchEnd(state, state.turnMatch);
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
        const winner = state.turnMatch?.winner ?? round.matches[matchIndex]?.winner;
        if (matchIndex >= 0 && winner) {
          round.matches[matchIndex] = { ...round.matches[matchIndex], winner };
        }
      }

      if (round.matches.every(m => m.winner !== null)) {
        if (currentRoundIdx >= 3) {
          const finalMatch = round.matches[0];
          const championTeam = finalMatch.winner === 'blue' ? finalMatch.teamA : finalMatch.teamB;
          const playerIsChampion = championTeam.id === 'player';
          const rewards = playerIsChampion
            ? buildRewards(state.defeatedRival)
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
            turnMatch: null,
            matchResult: playerIsChampion ? 'win' : (state.matchResult === 'lose' ? 'lose' : state.matchResult),
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

    case 'EXIT_TO_MODE':
    case 'RESET_TOURNAMENT':
      return { ...initialState, currentScreen: 'modeSelect' };

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
  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export type { LaneId };
