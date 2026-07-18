import type { GameMode, HumanTeamSetup } from '@/types/game';

export const HUMAN_TEAM_IDS = ['human_0', 'human_1'] as const;
export type HumanTeamId = (typeof HUMAN_TEAM_IDS)[number];

export function isHumanTeamId(id: string): boolean {
  return id === 'player' || id === 'human_0' || id === 'human_1';
}

export function humanTeamIndex(id: string): 0 | 1 | null {
  if (id === 'human_0' || id === 'player') return 0;
  if (id === 'human_1') return 1;
  return null;
}

export function isCoopLocal(mode: GameMode | null): boolean {
  return mode === 'coop_local';
}

export function getHumanTeamSetup(
  humanTeams: [HumanTeamSetup | null, HumanTeamSetup | null],
  teamId: string,
): HumanTeamSetup | null {
  const idx = humanTeamIndex(teamId);
  if (idx === null) return null;
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
