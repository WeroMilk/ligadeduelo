import type { Role, RosterMember } from '@/types/game';
import type { FanOrg } from '@/lib/game-data';

const ROLES: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];

/** Plantillas de nicks creíbles por región (se mezclan por org). */
const NICKS: Record<string, Partial<Record<Role, string[]>>> = {
  LEC: {
    top: ['Wunder', 'BrokenBlade', 'Odoamne', 'Adam', 'Canna'],
    jungle: ['Jankos', 'Razork', 'Yike', 'Elyoya', 'Sheo'],
    mid: ['Caps', 'Humanoid', 'Larssen', 'Vetheo', 'Nuc'],
    adc: ['Rekkles', 'Upset', 'Hans Sama', 'Ice', 'Caliste'],
    support: ['Mikyx', 'Hylissang', 'Trymbi', 'Alvaro', 'Jun'],
  },
  LCK: {
    top: ['Zeus', 'Kiin', 'Doran', 'Rascal', 'CuVee'],
    jungle: ['Oner', 'Canyon', 'Peanut', 'Clid', 'Blank'],
    mid: ['Faker', 'Chovy', 'ShowMaker', 'Bdd', 'Crown'],
    adc: ['Gumayusi', 'Ruler', 'Viper', 'Deft', 'Pray'],
    support: ['Keria', 'BeryL', 'Lehends', 'Wolf', 'Effort'],
  },
  LPL: {
    top: ['Bin', '369', 'TheShy', 'Ale', 'Zoom'],
    jungle: ['Xun', 'Jiejie', 'Wei', 'Karsa', 'Tian'],
    mid: ['Knight', 'Yagao', 'Rookie', 'xiaohu', 'Scout'],
    adc: ['Elk', 'GALA', 'JackeyLove', 'Light', 'Imp'],
    support: ['ON', 'Meiko', 'Missing', 'Crisp', 'Ming'],
  },
  LCS: {
    top: ['Impact', 'Bwipo', 'Licorice', 'Hauntzer', 'Ssumday'],
    jungle: ['Blaber', 'Inspired', 'Spica', 'Xmithie', 'Contractz'],
    mid: ['Jojopyun', 'APA', 'Jensen', 'Bjergsen', 'PowerOfEvil'],
    adc: ['Berserker', 'Yeon', 'Doublelift', 'Zven', 'Sneaky'],
    support: ['CoreJJ', 'Busio', 'Vulcan', 'Biofrost', 'Smoothie'],
  },
  default: {
    top: ['Alpha', 'Steel', 'Forge', 'Titan', 'Bolt'],
    jungle: ['Shade', 'Moss', 'Hunt', 'Ghost', 'Leaf'],
    mid: ['Spark', 'Nova', 'Arc', 'Flux', 'Rune'],
    adc: ['Arrow', 'Pierce', 'Swift', 'Mark', 'Flash'],
    support: ['Ward', 'Shield', 'Anchor', 'Pulse', 'Heal'],
  },
};

function regionKey(region: string): string {
  if (region.includes('LEC')) return 'LEC';
  if (region.includes('LCK')) return 'LCK';
  if (region.includes('LPL')) return 'LPL';
  if (region.includes('LCS')) return 'LCS';
  return 'default';
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Genera roster de 7 jugadores (cubre los 5 roles + 2 extras) para una org. */
export function buildOrgRoster(org: FanOrg): RosterMember[] {
  const pool = NICKS[regionKey(org.region)] || NICKS.default;
  const members: RosterMember[] = [];
  const used = new Set<string>();

  for (const role of ROLES) {
    const list = pool[role] || NICKS.default[role]!;
    const idx = hash(`${org.id}-${role}`) % list.length;
    let name = list[idx];
    let n = 0;
    while (used.has(name) && n < list.length) {
      n++;
      name = list[(idx + n) % list.length];
    }
    used.add(name);
    members.push({
      id: `${org.id}_${role}_${name.toLowerCase().replace(/\s+/g, '_')}`,
      name,
      role,
      image: `/players/${role}.svg`,
      orgId: org.id,
      orgName: org.name,
    });
  }

  // 2 extras (oft swaps)
  for (const role of ['mid', 'adc'] as Role[]) {
    const list = pool[role] || NICKS.default[role]!;
    const idx = (hash(`${org.id}-extra-${role}`) + 2) % list.length;
    let name = list[idx];
    let n = 0;
    while (used.has(name) && n < list.length) {
      n++;
      name = list[(idx + n) % list.length];
    }
    used.add(name);
    members.push({
      id: `${org.id}_x_${role}_${name.toLowerCase().replace(/\s+/g, '_')}`,
      name,
      role,
      image: `/players/${role}.svg`,
      orgId: org.id,
      orgName: org.name,
    });
  }

  return members;
}

/** Pool de todas las orgs para dream-team multi-equipo. */
export function buildAllRosters(orgs: FanOrg[]): RosterMember[] {
  return orgs.flatMap(o => buildOrgRoster(o));
}
