import type { Role, RosterMember } from '@/types/game';
import { FAN_ORGS, fanOrgDisplayName, type FanOrg } from '@/lib/game-data';
import { resolvePlayerProfile } from '@/lib/player-synergy';

const ROLE_ORDER: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];

function slug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_');
}

/** Roster explícito de una org (sin inventar nicks), ordenado por rol. */
export function buildOrgRoster(org: FanOrg): RosterMember[] {
  const displayOrg = fanOrgDisplayName(org);
  const indexed = org.players.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => {
    const roleDiff = ROLE_ORDER.indexOf(a.p.role) - ROLE_ORDER.indexOf(b.p.role);
    if (roleDiff !== 0) return roleDiff;
    return a.i - b.i;
  });
  return indexed.map(({ p, i }) => {
    const profile = resolvePlayerProfile(p.name, p.role, {
      ...(p.mechanics !== undefined ? { mechanics: p.mechanics } : {}),
      ...(p.macro !== undefined ? { macro: p.macro } : {}),
      ...(p.styles !== undefined ? { styles: p.styles } : {}),
      ...(p.signatureChampionIds !== undefined
        ? { signatureChampionIds: p.signatureChampionIds }
        : {}),
    });
    return {
      id: `${org.id}_${p.role}_${slug(p.name)}_${i}`,
      name: p.name,
      role: p.role,
      image: `/players/${p.role}.svg`,
      orgId: org.id,
      orgName: displayOrg,
      mechanics: profile.mechanics,
      macro: profile.macro,
      styles: profile.styles,
      signatureChampionIds: profile.signatureChampionIds,
    };
  });
}

/** Pool de todas las orgs con los jugadores de la lista. */
export function buildAllRosters(orgs: FanOrg[]): RosterMember[] {
  return orgs.flatMap(o => buildOrgRoster(o));
}

export function rosterForTeamName(teamName: string): RosterMember[] | null {
  const org = FAN_ORGS.find(o => o.name === teamName || o.id === teamName);
  if (!org || org.players.length === 0) return null;
  return buildOrgRoster(org);
}

export type { Role };
