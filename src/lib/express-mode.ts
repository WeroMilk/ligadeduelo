import type { GameMode } from '@/types/game';
import { MAX_MATCH_ROUNDS } from '@/lib/game-data';

const DEFAULT_HIT_PAUSE_MS = 2000;

export function isExpressMode(mode: GameMode | null): boolean {
  return mode === 'ai';
}

export type MatchTimings = {
  maxRounds: number;
  promptSec: number;
  hitPauseMs: number;
  laneIntroMs: number;
  cinemaBufferMs: number;
  maxCinemaHits: number;
  nexusClaimMs: number;
  qteCountdownStepMs: number;
  skirmishGoal: number;
  qteHitDmgMult: number;
  skipMonsterPhase: boolean;
  qteMaxSec: number;
  disableQteReplay: boolean;
  matchBudgetSec: number;
};

export type SetupTimings = {
  setupBudgetSec: number;
};

export type BracketTimings = {
  aiMatchDelayMs: number;
  skipPostMatchAds: boolean;
  victoryAutoAdvanceMs: number;
};

const DEFAULT_MATCH: MatchTimings = {
  maxRounds: MAX_MATCH_ROUNDS,
  promptSec: 8,
  hitPauseMs: DEFAULT_HIT_PAUSE_MS,
  laneIntroMs: 550,
  cinemaBufferMs: 4000,
  maxCinemaHits: Infinity,
  nexusClaimMs: 2200,
  qteCountdownStepMs: 700,
  skirmishGoal: 100,
  qteHitDmgMult: 1,
  skipMonsterPhase: false,
  qteMaxSec: 55,
  disableQteReplay: false,
  matchBudgetSec: Infinity,
};

const DEFAULT_SETUP: SetupTimings = {
  setupBudgetSec: Infinity,
};

const EXPRESS_SETUP: SetupTimings = {
  setupBudgetSec: 180,
};

const DEFAULT_BRACKET: BracketTimings = {
  aiMatchDelayMs: 1100,
  skipPostMatchAds: false,
  victoryAutoAdvanceMs: 0,
};

const EXPRESS_BRACKET: BracketTimings = {
  aiMatchDelayMs: 400,
  skipPostMatchAds: true,
  victoryAutoAdvanceMs: 2500,
};

/** Timings de partida en vivo: siempre el ritmo normal (disfrutar la partida). */
export function getMatchTimings(_mode: GameMode | null): MatchTimings {
  return DEFAULT_MATCH;
}

export function getSetupTimings(mode: GameMode | null): SetupTimings {
  return isExpressMode(mode) ? EXPRESS_SETUP : DEFAULT_SETUP;
}

export function getBracketTimings(mode: GameMode | null): BracketTimings {
  return isExpressMode(mode) ? EXPRESS_BRACKET : DEFAULT_BRACKET;
}

/** Segundos restantes de armado (0 si expiró o no aplica). */
export function setupSecondsLeft(deadlineMs: number | null, mode: GameMode | null): number | null {
  if (!isExpressMode(mode) || deadlineMs == null) return null;
  return Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
}

