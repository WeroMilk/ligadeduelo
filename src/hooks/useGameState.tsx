import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type {
  GameScreen, Champion, TeamData, Tournament, Match, TurnMatchState,
  GameMode, LobbyPlayer, RosterMember, TeamPlan, LaneId, TeamColor,
  HumanTeamSetup,
} from '@/types/game';
import { createTeam } from '@/lib/game-engine';
import {
  createTurnMatch, createTurnTeam, resolveRound, generateAIPlan, aiBuyItems, finishPendingObjective,
  simulateAITurnMatch, buildMatchResultSummary,
} from '@/lib/turn-engine';
import { CHAMPIONS, AI_TEAM_NAMES, getChampionBaseStats } from '@/lib/game-data';
import { rosterForTeamName } from '@/lib/rosters';
import {
  getHumanTeamSetup, isCoopLocal, isHumanTeamId, matchHumanMeta,
  humanTeamId, initHumanEliminatedRound, preferHumanOnTeamA,
  hasDuplicateTeamNames,
  COOP_MAX_PLAYERS, COOP_MIN_PLAYERS,
} from '@/lib/coop';
import {
  getMatchTimings,
  getSetupTimings,
  isExpressMode,
} from '@/lib/express-mode';
import { autofillTeamSetup } from '@/lib/setup-autofill';
import {
  beginPlayerRun,
  finalizePlayerRun,
  noteObjectiveFromResolution,
  recordPlayerMatchEnd,
  resetCurrentMatchObjectives,
} from '@/lib/player-leaderboard';

const ROUND_PLACE: Record<number, string> = {
  0: '9º–16º · Octavos',
  1: '5º–8º · Cuartos',
  2: '3º–4º · Semifinal',
  3: '2º · Subcampeón',
};

function placementLabel(wonTournament: boolean, eliminatedRound: number | null): string {
  if (wonTournament) return '1º · Campeón del torneo';
  if (eliminatedRound === null) return 'Eliminado';
  return ROUND_PLACE[eliminatedRound] ?? 'Eliminado';
}

const emptyPlan = (): TeamPlan => ({ actions: {}, ultimates: [], bootsLane: {} });

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
  /** Ronda en la que el jugador fue eliminado (0–3). null si sigue vivo / campeón. */
  playerEliminatedRound: number | null;
  /** Coop: índice del jugador armando equipo. */
  coopSetupPlayerIndex: number;
  humanTeams: (HumanTeamSetup | null)[];
  humanEliminatedRound: Record<string, number | null>;
  /** Lado humano en partida vs IA (coop). */
  playerSide: TeamColor | null;
  /** Nombre del ganador de la última partida (coop PvP). */
  lastMatchWinnerName: string | null;
  /** Express: timestamp límite para armado 5+5. */
  setupDeadlineMs: number | null;
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
  playerEliminatedRound: null,
  coopSetupPlayerIndex: 0,
  humanTeams: [],
  humanEliminatedRound: {},
  playerSide: null,
  lastMatchWinnerName: null,
  setupDeadlineMs: null,
};

type GameAction =
  | { type: 'SET_SCREEN'; screen: GameScreen }
  | { type: 'SET_GAME_MODE'; mode: GameMode }
  | { type: 'ADD_LOBBY_PLAYER'; name: string; teamName?: string }
  | { type: 'UPDATE_LOBBY_PLAYER'; id: string; name?: string; teamName?: string }
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
  | { type: 'RESOLVE_LIVE_ROUND'; bluePlan?: TeamPlan; redPlan?: TeamPlan }
  | {
      type: 'RESOLVE_OBJECTIVE_QTE';
      qte: {
        skirmishWinner: TeamColor | null;
        attackingTeam: TeamColor;
        monsterTaken: boolean;
        loserFate?: 'killed' | 'escaped';
      };
    }
  | { type: 'FINISH_LIVE_MATCH' }
  | { type: 'ADVANCE_BRACKET' }
  | { type: 'SIMULATE_ONE_AI_MATCH' }
  | { type: 'EXIT_TO_MODE' }
  | { type: 'RESET_TOURNAMENT' }
  | { type: 'AUTO_FILL_SETUP' };

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

function buildRewards(): { titles: string[]; frame: Tournament['championFrame'] } {
  return {
    titles: ['Campeón de la Grieta', 'Estrella del Bracket'],
    frame: 'gold',
  };
}

function withOrgRoster(team: TeamData): TeamData {
  const roster = team.rosterMembers ?? rosterForTeamName(team.name) ?? undefined;
  return roster ? { ...team, rosterMembers: roster } : team;
}

function buildTeamFromSetup(setup: HumanTeamSetup, teamId: string, color: TeamColor): TeamData {
  return {
    ...createTeam(teamId, setup.teamName, color, setup.champions.map(c => c.defId)),
    rosterMembers: setup.roster,
  };
}

function generateCoopTournament(setups: HumanTeamSetup[]): Tournament {
  const humanTeamsData = setups.map((setup, i) =>
    buildTeamFromSetup(setup, humanTeamId(i), i % 2 === 0 ? 'blue' : 'red'),
  );
  const usedNames = new Set<string>(humanTeamsData.map(t => nameKey(t.name)));
  const namePool = shuffleInPlace(AI_TEAM_NAMES.filter(n => !usedNames.has(nameKey(n))));
  const excludeIds = new Set(
    humanTeamsData.flatMap(t => t.champions.map(c => c.defId)),
  );
  const champPools = createChampPools(excludeIds);
  const teams: TeamData[] = [...humanTeamsData];

  let aiIdx = 0;
  while (teams.length < 16) {
    let aiName = namePool.shift();
    if (!aiName) {
      aiName = `Equipo ${aiIdx + 1}`;
      while (usedNames.has(nameKey(aiName))) {
        aiIdx++;
        aiName = `Equipo ${aiIdx + 1}`;
      }
    }
    usedNames.add(nameKey(aiName));
    teams.push(withOrgRoster(createTeam(`ai_${aiIdx}`, aiName, 'red', drawLineup(champPools))));
    aiIdx++;
  }

  const shuffled = shuffleInPlace([...teams]);
  const round1Matches: Match[] = [];
  for (let i = 0; i < 8; i++) {
    let teamA = shuffled[i * 2];
    let teamB = shuffled[i * 2 + 1];
    if (!preferHumanOnTeamA(teamA.id, teamB.id)) [teamA, teamB] = [teamB, teamA];
    const meta = matchHumanMeta(teamA.id, teamB.id);
    round1Matches.push({
      id: `r1_m${i}`,
      round: 0,
      roundName: 'Octavos',
      teamA,
      teamB,
      winner: null,
      isSimulated: false,
      ...meta,
    });
  }
  return {
    rounds: [
      { round: 0, roundName: 'Octavos', matches: round1Matches },
      { round: 1, roundName: 'Cuartos', matches: [] },
      { round: 2, roundName: 'Semifinal', matches: [] },
      { round: 3, roundName: 'Final', matches: [] },
    ],
    playerTeam: humanTeamsData[0],
    currentRound: 0,
    isComplete: false,
    champion: null,
    titles: [],
    championFrame: 'none',
  };
}

function generateTournament(playerTeam: TeamData, lobbyPlayers: LobbyPlayer[], mode: GameMode | null): Tournament {
  void mode;
  const usedNames = new Set<string>([nameKey(playerTeam.name)]);
  const namePool = shuffleInPlace(
    AI_TEAM_NAMES.filter(n => !usedNames.has(nameKey(n))),
  );

  const playerChampIds = new Set(playerTeam.champions.map(c => c.defId));
  const champPools = createChampPools(playerChampIds);

  const teams: TeamData[] = [playerTeam];

  const friendSlots = lobbyPlayers.filter(p => !p.isHost).slice(0, 14);
  for (let i = 0; i < friendSlots.length; i++) {
    const fname = friendSlots[i].name;
    usedNames.add(nameKey(fname));
    teams.push(withOrgRoster(createTeam(`friend_${i}`, fname, 'red', drawLineup(champPools))));
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
    teams.push(withOrgRoster(createTeam(`ai_${aiIdx}`, name, 'red', drawLineup(champPools))));
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
    titles: [],
    championFrame: 'none',
  };
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
  const resultSummary = buildMatchResultSummary(sealed);
  const match = state.currentMatch;
  const winnerName = winner === 'blue' ? turnMatch.blue.name : turnMatch.red.name;
  let tournament = state.tournament;
  if (tournament && match) {
    const rounds = tournament.rounds.map((r, idx) => {
      if (idx !== tournament!.currentRound) return r;
      return {
        ...r,
        matches: r.matches.map(m =>
          m.id === match.id
            ? { ...m, winner, isSimulated: false, resultSummary }
            : m
        ),
      };
    });
    tournament = { ...tournament, rounds };
  }

  let humanEliminatedRound = { ...state.humanEliminatedRound };
  if (isCoopLocal(state.gameMode) && match) {
    const loserId = winner === 'blue' ? match.teamB.id : match.teamA.id;
    if (isHumanTeamId(loserId)) {
      humanEliminatedRound[loserId] = state.tournament?.currentRound ?? null;
    }
  }

  const isPvp = match?.isPvpMatch;
  let currentScreen: GameScreen = result === 'win' ? 'victory' : 'defeat';
  if (isCoopLocal(state.gameMode) && isPvp) {
    currentScreen = 'victory';
  }

  return {
    ...state,
    turnMatch: sealed,
    tournament,
    matchResult: isPvp ? 'win' : result,
    playerEliminatedRound:
      !isCoopLocal(state.gameMode) && result === 'lose' && state.tournament
        ? state.tournament.currentRound
        : state.playerEliminatedRound,
    humanEliminatedRound,
    lastMatchWinnerName: isPvp ? winnerName : null,
    currentScreen,
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.screen };

    case 'SET_GAME_MODE': {
      if (action.mode === 'ai') {
        const setupMs = getSetupTimings('ai').setupBudgetSec * 1000;
        return {
          ...state,
          gameMode: 'ai',
          roomCode: '',
          lobbyPlayers: [{ id: 'host', name: 'Tú', teamName: '', isHost: true }],
          currentScreen: 'home',
          setupDeadlineMs: Date.now() + setupMs,
        };
      }
      if (action.mode === 'coop_local') {
        return {
          ...state,
          gameMode: 'coop_local',
          roomCode: '',
          lobbyPlayers: [{ id: 'host', name: 'Jugador 1', teamName: '', isHost: true }],
          humanTeams: [],
          coopSetupPlayerIndex: 0,
          humanEliminatedRound: {},
          currentScreen: 'lobby',
          setupDeadlineMs: null,
        };
      }
      return {
        ...state,
        gameMode: 'coop_code',
        roomCode: makeRoomCode(),
        lobbyPlayers: [{ id: 'host', name: 'Host', teamName: '', isHost: true }],
        currentScreen: 'lobby',
        setupDeadlineMs: null,
      };
    }

    case 'ADD_LOBBY_PLAYER': {
      const max = isCoopLocal(state.gameMode) ? COOP_MAX_PLAYERS : 16;
      if (state.lobbyPlayers.length >= max) return state;
      const slot = state.lobbyPlayers.length;
      const playerName = action.name.trim() || (isCoopLocal(state.gameMode) ? `Jugador ${slot + 1}` : `Amigo ${slot}`);
      const teamName = action.teamName?.trim() ?? '';
      return {
        ...state,
        lobbyPlayers: [
          ...state.lobbyPlayers,
          { id: `p_${Date.now()}_${slot}`, name: playerName, teamName, isHost: false },
        ],
      };
    }

    case 'UPDATE_LOBBY_PLAYER': {
      const idx = state.lobbyPlayers.findIndex(p => p.id === action.id);
      if (idx < 0) return state;
      const current = state.lobbyPlayers[idx];
      const updated: LobbyPlayer = {
        ...current,
        ...(action.name !== undefined ? { name: action.name.slice(0, 18) } : {}),
        ...(action.teamName !== undefined ? { teamName: action.teamName.slice(0, 24) } : {}),
      };
      return {
        ...state,
        lobbyPlayers: state.lobbyPlayers.map((p, i) => (i === idx ? updated : p)),
      };
    }

    case 'REMOVE_LOBBY_PLAYER':
      return {
        ...state,
        lobbyPlayers: state.lobbyPlayers.filter(p => p.id !== action.id || p.isHost),
      };

    case 'CONFIRM_LOBBY': {
      if (state.gameMode === 'coop_local') {
        const count = state.lobbyPlayers.length;
        if (count < COOP_MIN_PLAYERS || count > COOP_MAX_PLAYERS) return state;
        const allTeamsNamed = state.lobbyPlayers.every(p => p.teamName.trim().length >= 2);
        if (!allTeamsNamed || hasDuplicateTeamNames(state.lobbyPlayers)) return state;
        const first = state.lobbyPlayers[0];
        return {
          ...state,
          currentScreen: 'rosterSelect',
          coopSetupPlayerIndex: 0,
          playerTeamName: first.teamName.trim(),
          selectedFanOrgId: null,
          selectedRoster: [],
          selectedChampions: [],
          champToRoster: {},
          humanTeams: Array(count).fill(null),
          humanEliminatedRound: initHumanEliminatedRound(count),
        };
      }
      if (state.gameMode === 'coop_code' && state.lobbyPlayers.length < 2) return state;
      return {
        ...state,
        currentScreen: 'home',
        coopSetupPlayerIndex: 0,
        playerTeamName: '',
        selectedRoster: [],
        selectedChampions: [],
        champToRoster: {},
      };
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
        deaths: 0,
        assists: 0,
        position: { lane: 0, x: 0 },
        gold: 100,
        tearStacks: 0,
        burnPending: 0,
        ultimateCooldown: 0,
        siegeStacks: 0,
        lifeSteal: 0,
        skipTurns: 0,
        recallingForMana: false,
        passiveCounter: 0,
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

      if (isCoopLocal(state.gameMode)) {
        const n = state.lobbyPlayers.length;
        const idx = state.coopSetupPlayerIndex;
        const lobbyPlayer = state.lobbyPlayers[idx];
        const setup: HumanTeamSetup = {
          lobbyPlayerId: lobbyPlayer?.id ?? humanTeamId(idx),
          teamName: lobbyPlayer?.teamName.trim() || lobbyPlayer?.name || `Equipo ${idx + 1}`,
          fanOrgId: state.selectedFanOrgId,
          roster: [...state.selectedRoster],
          champions: [...state.selectedChampions],
          champToRoster: { ...state.champToRoster },
        };
        const humanTeams = [...state.humanTeams];
        humanTeams[idx] = setup;

        if (idx < n - 1) {
          if (idx === 0) {
            beginPlayerRun(setup.teamName, setup.roster, setup.champions.map(c => c.defId));
          }
          const nextLobby = state.lobbyPlayers[idx + 1];
          return {
            ...state,
            humanTeams,
            coopSetupPlayerIndex: idx + 1,
            playerTeamName: nextLobby?.teamName.trim() || nextLobby?.name || '',
            selectedFanOrgId: null,
            selectedRoster: [],
            selectedChampions: [],
            champToRoster: {},
            currentScreen: 'rosterSelect',
          };
        }

        const team0 = humanTeams[0]!;
        return {
          ...state,
          humanTeams,
          playerTeamName: team0.teamName,
          tournament: generateCoopTournament(humanTeams.filter(Boolean) as HumanTeamSetup[]),
          currentScreen: 'bracket',
          playerEliminatedRound: null,
          humanEliminatedRound: initHumanEliminatedRound(n),
        };
      }

      beginPlayerRun(
        state.playerTeamName || 'Mi Equipo',
        state.selectedRoster,
        state.selectedChampions.map(c => c.defId),
      );
      const playerTeam: TeamData = {
        ...createTeam(
          'player',
          state.playerTeamName || 'Mi Equipo',
          'blue',
          state.selectedChampions.map(c => c.defId),
        ),
        rosterMembers: state.selectedRoster,
      };
      return {
        ...state,
        tournament: generateTournament(playerTeam, state.lobbyPlayers, state.gameMode),
        currentScreen: 'bracket',
        playerEliminatedRound: null,
        setupDeadlineMs: null,
      };
    }

    case 'AUTO_FILL_SETUP': {
      if (!isExpressMode(state.gameMode)) return state;
      const screen = state.currentScreen;
      if (screen !== 'home' && screen !== 'rosterSelect' && screen !== 'championSelect') return state;

      const filled = autofillTeamSetup(
        state.selectedRoster,
        state.selectedChampions,
        state.champToRoster,
      );
      let next: GameState = {
        ...state,
        selectedRoster: filled.selectedRoster,
        selectedChampions: filled.selectedChampions,
        champToRoster: filled.champToRoster,
        playerTeamName: state.playerTeamName.trim() || 'Mi Equipo',
      };

      const rosterReady = next.selectedRoster.length === 5;
      const champsReady = next.selectedChampions.length === 5;

      if (!rosterReady) return next;
      if (screen === 'home' || screen === 'rosterSelect') {
        if (!champsReady) {
          return { ...next, currentScreen: 'championSelect' };
        }
      }

      if (champsReady) {
        return gameReducer(next, { type: 'CONFIRM_TEAM' });
      }
      return next;
    }

    case 'PREPARE_MATCH': {
      if (!state.tournament) return state;
      const round = state.tournament.rounds[state.tournament.currentRound];
      const match = round.matches.find(m => m.id === action.matchId);
      if (!match) return state;

      const rosterFor = (teamId: string) => {
        const setup = getHumanTeamSetup(state.humanTeams, teamId);
        if (setup) return setup.roster;
        if (teamId === 'player') return state.selectedRoster;
        return undefined;
      };
      const champMapFor = (teamId: string) => {
        const setup = getHumanTeamSetup(state.humanTeams, teamId);
        if (setup) return setup.champToRoster;
        if (teamId === 'player') return state.champToRoster;
        return undefined;
      };
      const fallbackRoster = (teamId: string, teamName: string) =>
        rosterFor(teamId) ?? rosterForTeamName(teamName) ?? undefined;

      const blueRoster = fallbackRoster(match.teamA.id, match.teamA.name);
      const redRoster = fallbackRoster(match.teamB.id, match.teamB.name);
      const blue = createTurnTeam(
        match.teamA.id,
        match.teamA.name,
        'blue',
        match.teamA.champions.map(c => c.defId),
        blueRoster,
        champMapFor(match.teamA.id),
      );
      const red = createTurnTeam(
        match.teamB.id,
        match.teamB.name,
        'red',
        match.teamB.champions.map(c => c.defId),
        redRoster,
        champMapFor(match.teamB.id),
      );
      const turnMatch = createTurnMatch(blue, red, null, {
        maxRounds: getMatchTimings(state.gameMode).maxRounds,
      });
      if (match.isPlayerMatch) resetCurrentMatchObjectives();

      let playerSide: TeamColor | null = null;
      if (isCoopLocal(state.gameMode) && match.humanTeamIds?.length === 1) {
        const hid = match.humanTeamIds[0];
        playerSide = match.teamA.id === hid ? 'blue' : 'red';
      } else if (!isCoopLocal(state.gameMode)) {
        playerSide = 'blue';
      }

      return {
        ...state,
        currentMatch: match,
        turnMatch,
        matchResult: null,
        playerPlan: emptyPlan(),
        enemyPlanPreview: null,
        playerSide,
        lastMatchWinnerName: null,
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

      let bluePlan = action.bluePlan;
      let redPlan = action.redPlan;
      if (!bluePlan && redPlan) {
        bluePlan = generateAIPlan(tm, 'blue');
      }
      if (bluePlan && !redPlan) {
        redPlan = generateAIPlan(tm, 'red', bluePlan);
      }
      if (!bluePlan || !redPlan) return state;

      const resolved = resolveRound(tm, bluePlan, redPlan);
      if (state.currentMatch?.isPlayerMatch) {
        noteObjectiveFromResolution(resolved.lastResolution);
      }
      return {
        ...state,
        turnMatch: { ...resolved, pendingReward: false },
        playerPlan: bluePlan,
        enemyPlanPreview: redPlan,
      };
    }

    case 'RESOLVE_OBJECTIVE_QTE': {
      if (!state.turnMatch?.pendingObjective) return state;
      const resolved = finishPendingObjective(state.turnMatch, action.qte);
      if (state.currentMatch?.isPlayerMatch) {
        noteObjectiveFromResolution(resolved.lastResolution);
      }
      return {
        ...state,
        turnMatch: { ...resolved, pendingReward: false },
      };
    }

    case 'FINISH_LIVE_MATCH': {
      if (!state.turnMatch) return state;
      if (state.currentMatch?.isPlayerMatch && !state.currentMatch.isPvpMatch) {
        const winner = resolveLiveWinner(state.turnMatch);
        const humanId = state.currentMatch.humanTeamIds?.[0];
        const isHumanBlue =
          state.currentMatch.teamA.id === humanId || state.currentMatch.teamA.id === 'player';
        const playerWon = isHumanBlue ? winner === 'blue' : winner === 'red';
        const opponent =
          isHumanBlue ? state.currentMatch.teamB.name : state.currentMatch.teamA.name;
        if (!isCoopLocal(state.gameMode) || humanId === 'human_0') {
          recordPlayerMatchEnd(state.turnMatch, opponent, playerWon);
        }
      }
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
          const playerIsChampion = isHumanTeamId(championTeam.id);
          const rewards = playerIsChampion
            ? buildRewards()
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
            playerSide: null,
            matchResult: playerIsChampion ? 'win' : (state.matchResult === 'lose' ? 'lose' : state.matchResult),
          };
        }
        const winners: TeamData[] = round.matches.map(m => (m.winner === 'blue' ? m.teamA : m.teamB));
        const nextRound = t.rounds[currentRoundIdx + 1];
        nextRound.matches = [];
        for (let i = 0; i < winners.length / 2; i++) {
          let teamA = winners[i * 2];
          let teamB = winners[i * 2 + 1];
          if (!preferHumanOnTeamA(teamA.id, teamB.id)) [teamA, teamB] = [teamB, teamA];
          const meta = matchHumanMeta(teamA.id, teamB.id);
          nextRound.matches.push({
            id: `r${currentRoundIdx + 1}_m${i}`,
            round: currentRoundIdx + 1,
            roundName: nextRound.roundName,
            teamA,
            teamB,
            winner: null,
            isSimulated: false,
            ...meta,
          });
        }
        t.currentRound = currentRoundIdx + 1;
      }

      return {
        ...state,
        tournament: t,
        currentMatch: null,
        turnMatch: null,
        playerSide: null,
        currentScreen: 'bracket',
        matchResult: null,
        playerPlan: emptyPlan(),
      };
    }

    case 'SIMULATE_ONE_AI_MATCH': {
      if (!state.tournament) return state;
      const rounds = state.tournament.rounds.map((round, idx) => {
        if (idx !== state.tournament!.currentRound) return round;
        const pendingIdx = round.matches.findIndex(
          m => m.winner === null && (!m.humanTeamIds || m.humanTeamIds.length === 0),
        );
        if (pendingIdx < 0) return round;
        const match = round.matches[pendingIdx];
        const finalState = simulateAITurnMatch(match.teamA, match.teamB);
        const winner = finalState.winner || 'blue';
        const resultSummary = buildMatchResultSummary(finalState);
        return {
          ...round,
          matches: round.matches.map((m, i) =>
            i === pendingIdx ? { ...m, winner, isSimulated: true, resultSummary } : m
          ),
        };
      });
      return { ...state, tournament: { ...state.tournament, rounds } };
    }

    case 'EXIT_TO_MODE':
    case 'RESET_TOURNAMENT': {
      const wonTournament = isHumanTeamId(state.tournament?.champion?.id ?? '');
      finalizePlayerRun({
        wonTournament,
        placement: placementLabel(wonTournament, state.playerEliminatedRound),
      });
      return { ...initialState, currentScreen: 'modeSelect' };
    }

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
