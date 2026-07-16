import type { Role, RosterMember } from '@/types/game';
import { fanOrgDisplayName, type FanOrg } from '@/lib/game-data';

function slug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_');
}

/** Roster explícito de una org (sin inventar nicks). */
export function buildOrgRoster(org: FanOrg): RosterMember[] {
  const displayOrg = fanOrgDisplayName(org);
  return org.players.map((p, i) => ({
    id: `${org.id}_${p.role}_${slug(p.name)}_${i}`,
    name: p.name,
    role: p.role,
    image: `/players/${p.role}.svg`,
    orgId: org.id,
    orgName: displayOrg,
  }));
}

/** Pool de todas las orgs con los jugadores de la lista. */
export function buildAllRosters(orgs: FanOrg[]): RosterMember[] {
  return orgs.flatMap(o => buildOrgRoster(o));
}

export type { Role };
