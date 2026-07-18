import type { Champion, Role, RosterMember } from '@/types/game';
import { CHAMPIONS, FAN_ORGS, getChampionBaseStats } from '@/lib/game-data';
import { buildAllRosters } from '@/lib/rosters';

const ROLES: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]!];
  }
  return copy;
}

/** Completa roster a 5 integrantes (1 por rol). Conserva picks existentes. */
export function autofillRoster(current: RosterMember[]): RosterMember[] {
  const pool = buildAllRosters(FAN_ORGS);
  const byRole = new Map<Role, RosterMember>();
  for (const m of current) byRole.set(m.role, m);

  for (const role of ROLES) {
    if (byRole.has(role)) continue;
    const candidates = shuffle(pool.filter(m => m.role === role && !Array.from(byRole.values()).some(x => x.id === m.id)));
    if (candidates.length > 0) byRole.set(role, pickRandom(candidates));
  }

  return ROLES.map(r => byRole.get(r)).filter(Boolean) as RosterMember[];
}

function makeChampion(defId: string): Champion {
  return {
    instanceId: `p_${defId}`,
    defId,
    team: 'blue',
    stats: getChampionBaseStats(defId),
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
}

/** Completa campeones a 5 (1 por rol) y champToRoster. */
export function autofillChampions(
  roster: RosterMember[],
  currentChamps: Champion[],
  currentMap: Record<string, string>,
): { champions: Champion[]; champToRoster: Record<string, string> } {
  const byRole = new Map<Role, Champion>();
  for (const c of currentChamps) {
    const def = CHAMPIONS.find(x => x.id === c.defId);
    if (def) byRole.set(def.role, c);
  }

  const usedIds = new Set(currentChamps.map(c => c.defId));
  const champToRoster = { ...currentMap };

  for (const role of ROLES) {
    if (byRole.has(role)) continue;
    const pool = shuffle(CHAMPIONS.filter(c => c.role === role && !usedIds.has(c.id)));
    const def = pool[0];
    if (!def) continue;
    usedIds.add(def.id);
    const champ = makeChampion(def.id);
    byRole.set(role, champ);
    const mate = roster.find(r => r.role === role);
    if (mate) champToRoster[def.id] = mate.id;
  }

  // Limpiar map de roles reemplazados
  for (const role of ROLES) {
    const champ = byRole.get(role);
    if (!champ) continue;
    Object.keys(champToRoster).forEach(k => {
      if (k === champ.defId) return;
      const cd = CHAMPIONS.find(x => x.id === k);
      if (cd?.role === role) delete champToRoster[k];
    });
    const mate = roster.find(r => r.role === role);
    if (mate) champToRoster[champ.defId] = mate.id;
  }

  return {
    champions: ROLES.map(r => byRole.get(r)).filter(Boolean) as Champion[],
    champToRoster,
  };
}

/** Aplica autofill completo 5+5. */
export function autofillTeamSetup(
  roster: RosterMember[],
  champions: Champion[],
  champToRoster: Record<string, string>,
): {
  selectedRoster: RosterMember[];
  selectedChampions: Champion[];
  champToRoster: Record<string, string>;
} {
  const selectedRoster = autofillRoster(roster);
  const filled = autofillChampions(selectedRoster, champions, champToRoster);
  return {
    selectedRoster,
    selectedChampions: filled.champions,
    champToRoster: filled.champToRoster,
  };
}
