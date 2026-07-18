import type { GameMode, HumanTeamSetup } from '@/types/game';

/** Máximo de amigos además del host en coop local. */
export const COOP_MAX_FRIENDS = 4;
export const COOP_MAX_PLAYERS = COOP_MAX_FRIENDS + 1;
export const COOP_MIN_PLAYERS = 2;

export function humanTeamId(index: number): string {
  return `human_${index}`;
}

export function isHumanTeamId(id: string): boolean {
  return id === 'player' || /^human_\d+$/.test(id);
}

export function humanTeamIndex(id: string): number | null {
  if (id === 'player') return 0;
  const m = id.match(/^human_(\d+)$/);
  return m ? Number.parseInt(m[1], 10) : null;
}

export function isCoopLocal(mode: GameMode | null): boolean {
  return mode === 'coop_local';
}

export function initHumanEliminatedRound(count: number): Record<string, number | null> {
  const r: Record<string, number | null> = {};
  for (let i = 0; i < count; i++) r[humanTeamId(i)] = null;
  return r;
}

export function getHumanTeamSetup(
  humanTeams: (HumanTeamSetup | null)[],
  teamId: string,
): HumanTeamSetup | null {
  const idx = humanTeamIndex(teamId);
  if (idx === null || idx < 0 || idx >= humanTeams.length) return null;
  return humanTeams[idx];
}

export function matchHumanMeta(teamAId: string, teamBId: string) {
  const humanTeamIds = [teamAId, teamBId].filter(isHumanTeamId);
  return {
    isPlayerMatch: humanTeamIds.length > 0,
    humanTeamIds,
    isPvpMatch: humanTeamIds.length === 2,
  };
}

export function preferHumanOnTeamA(teamAId: string, teamBId: string): boolean {
  const aIdx = humanTeamIndex(teamAId);
  const bIdx = humanTeamIndex(teamBId);
  if (aIdx === null && bIdx !== null) return false;
  if (bIdx === null) return true;
  if (aIdx === null) return true;
  return aIdx <= bIdx;
}

export function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9áéíóúñ]/gi, '');
}

export function hasDuplicateTeamNames(players: { teamName: string }[]): boolean {
  const seen = new Set<string>();
  for (const p of players) {
    const key = normalizeTeamName(p.teamName);
    if (key.length < 2) continue;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

export function isDuplicateTeamNameAt(players: { teamName: string }[], index: number): boolean {
  const key = normalizeTeamName(players[index]?.teamName ?? '');
  if (key.length < 2) return false;
  return players.some((p, i) => i !== index && normalizeTeamName(p.teamName) === key);
}
