import type {
  Champion, TeamData, TeamPlan, CombatAction, LaneId, TeamColor,
  TurnMatchState, RoundResolution, CombatLogLine, Structure,
  DuelSummary, DuelFighterSummary, CombatFloat, ObjectiveType,
  KillAnnounce, ObjectiveBonusAnnounce,
} from '@/types/game';
import { CHAMPIONS, getChampionBaseStats, ITEMS, ITEM_PRIORITY_BY_ROLE, MAX_MATCH_ROUNDS, GOLD_PER_ROUND, GOLD_PER_KILL, POINTS_KILL, POINTS_TOWER, POINTS_OBJECTIVE, POINTS_NEXUS, FREE_LANE_SIEGE_BONUS, objectiveForRound, objectiveName } from './game-data';
import { applyBuffToStats, type BuffId } from './buffs';
import type { Role } from '@/types/game';

let idCounter = 0;
function uid(prefix = 'c') { return `${prefix}${++idCounter}`; }
function logId() { return `l${++idCounter}`; }
function duelId() { return `d${++idCounter}`; }
function floatId() { return `f${++idCounter}`; }
function announceId() { return `a${++idCounter}`; }

type RawKill = {
  killerId: string;
  killerName: string;
  victimName: string;
  team: TeamColor;
};

function pushKill(
  kills: RawKill[],
  killer: Champion,
  victim: Champion,
) {
  kills.push({
    killerId: killer.instanceId,
    killerName: champDef(killer).name,
    victimName: champDef(victim).name,
    team: killer.team,
  });
}

function aggregateKillAnnounces(raw: RawKill[]): KillAnnounce[] {
  const order: string[] = [];
  const map = new Map<string, { killerName: string; team: TeamColor; victims: string[] }>();
  for (const k of raw) {
    let g = map.get(k.killerId);
    if (!g) {
      g = { killerName: k.killerName, team: k.team, victims: [] };
      map.set(k.killerId, g);
      order.push(k.killerId);
    }
    g.victims.push(k.victimName);
  }
  return order.map(id => {
    const g = map.get(id)!;
    return {
      id: announceId(),
      killerName: g.killerName,
      victimNames: g.victims,
      multi: Math.min(5, g.victims.length),
      team: g.team,
    };
  });
}

/** Ritmo de combate: menos intercambios y daño → partidas con pocas kills. */
const DUEL_MAX_EXCHANGES = 3;
const COMBAT_DAMAGE_MULT = 0.9;
/** Multiplicador extra de daño para el equipo rojo (IA). */
const AI_DAMAGE_MULT = 1.24;
const DEFEND_DAMAGE_MULT = 0.48;
const BURN_ARMOR_DMG = 12;
/** HP que permite tumbar torre+nexo antes de la ronda 10 si dejas una línea sola. */
const TOWER_MAX_HP = 1400;
const NEXUS_MAX_HP = 2000;
/** ~2–3 golpes por torre, ~3 por nexo. */
const SIEGE_TOWER_DMG = 520;
const SIEGE_NEXUS_DMG = 700;

/** Contexto de asedio durante resolveRound (amenazas letales a nexos). */
type SiegeCtx = {
  bluePlan: TeamPlan;
  redPlan: TeamPlan;
  /** Amenaza letal al nexo azul (defensa del jugador). */
  blueNexusThreat: null | { siegerId: string; lane: LaneId };
  /** Amenaza letal al nexo rojo (asalto del jugador). */
  redNexusThreat: null | { siegerId: string; lane: LaneId };
};

function pushFloat(
  floats: CombatFloat[],
  partial: Omit<CombatFloat, 'id'>,
) {
  floats.push({ id: floatId(), ...partial });
}

export function actionLabelEs(action: CombatAction): string {
  if (action === 'attack') return 'Atacar';
  if (action === 'ability') return 'Habilidad';
  return 'Defender';
}

export function laneLabel(lane: LaneId): string {
  return lane === 0 ? 'Superior' : lane === 1 ? 'Central' : 'Inferior';
}

function structureTargetName(type: 'tower' | 'nexus', lane: LaneId): string {
  return type === 'nexus' ? 'Nexo' : `Torre ${laneLabel(lane)}`;
}

function deepCloneChamp(c: Champion): Champion {
  return {
    ...c,
    stats: { ...c.stats },
    items: c.items.map(i => ({ ...i })),
    position: { ...c.position },
  };
}

function deepCloneTeam(t: TeamData): TeamData {
  return {
    ...t,
    champions: t.champions.map(deepCloneChamp),
  };
}

function roleLane(role: Role): LaneId {
  if (role === 'top') return 0;
  if (role === 'adc' || role === 'support') return 2;
  return 1; // mid + jungle home mid
}

export function createTurnChampion(defId: string, team: TeamColor): Champion {
  const def = CHAMPIONS.find(c => c.id === defId)!;
  const lane = roleLane(def.role);
  return {
    instanceId: uid(team === 'blue' ? 'b' : 'r'),
    defId,
    team,
    stats: getChampionBaseStats(defId),
    items: [],
    isAlive: true,
    respawnTimer: 0,
    kills: 0,
    position: { lane, x: team === 'blue' ? 0.2 : 0.8 },
    gold: 100,
    tearStacks: 0,
    burnPending: 0,
    ultimateUsed: false,
    siegeStacks: 0,
    lifeSteal: 0,
    skipTurns: 0,
  };
}

export function createTurnTeam(id: string, name: string, color: TeamColor, champIds: string[]): TeamData {
  return {
    id,
    name,
    color,
    champions: champIds.map(cid => createTurnChampion(cid, color)),
    nexusHp: NEXUS_MAX_HP,
    maxNexusHp: NEXUS_MAX_HP,
    kills: 0,
    score: 0,
    damageBuff: 0,
  };
}

function initStructures(): Structure[] {
  return [
    { id: 'tower_blue_0', type: 'tower', team: 'blue', lane: 0, hp: TOWER_MAX_HP, maxHp: TOWER_MAX_HP, position: { lane: 0, x: 0.25 }, isDestroyed: false },
    { id: 'tower_blue_1', type: 'tower', team: 'blue', lane: 1, hp: TOWER_MAX_HP, maxHp: TOWER_MAX_HP, position: { lane: 1, x: 0.25 }, isDestroyed: false },
    { id: 'tower_blue_2', type: 'tower', team: 'blue', lane: 2, hp: TOWER_MAX_HP, maxHp: TOWER_MAX_HP, position: { lane: 2, x: 0.25 }, isDestroyed: false },
    { id: 'tower_red_0', type: 'tower', team: 'red', lane: 0, hp: TOWER_MAX_HP, maxHp: TOWER_MAX_HP, position: { lane: 0, x: 0.75 }, isDestroyed: false },
    { id: 'tower_red_1', type: 'tower', team: 'red', lane: 1, hp: TOWER_MAX_HP, maxHp: TOWER_MAX_HP, position: { lane: 1, x: 0.75 }, isDestroyed: false },
    { id: 'tower_red_2', type: 'tower', team: 'red', lane: 2, hp: TOWER_MAX_HP, maxHp: TOWER_MAX_HP, position: { lane: 2, x: 0.75 }, isDestroyed: false },
    { id: 'nexus_blue', type: 'nexus', team: 'blue', lane: -1, hp: NEXUS_MAX_HP, maxHp: NEXUS_MAX_HP, position: { lane: 1, x: 0.05 }, isDestroyed: false },
    { id: 'nexus_red', type: 'nexus', team: 'red', lane: -1, hp: NEXUS_MAX_HP, maxHp: NEXUS_MAX_HP, position: { lane: 1, x: 0.95 }, isDestroyed: false },
  ];
}

export function createTurnMatch(blue: TeamData, red: TeamData, buffId?: BuffId | null): TurnMatchState {
  const b = deepCloneTeam(blue);
  const r = deepCloneTeam({ ...red, color: 'red' });
  for (const c of r.champions) c.team = 'red';
  if (buffId) {
    for (const c of b.champions) c.stats = applyBuffToStats(c.stats, buffId);
  }
  // Fair fight: winner from champs + decisions (no side buff).
  return {
    blue: b,
    red: r,
    round: 1,
    maxRounds: MAX_MATCH_ROUNDS,
    objective: objectiveForRound(1),
    structures: initStructures(),
    lastResolution: null,
    isComplete: false,
    winner: null,
    pendingReward: false,
    pendingObjective: null,
    deferredBluePlan: null,
    deferredRedPlan: null,
  };
}

export { objectiveForRound, objectiveName };

function hasItem(c: Champion, id: string) {
  return c.items.some(i => i.defId === id);
}

function champDef(c: Champion) {
  return CHAMPIONS.find(d => d.id === c.defId)!;
}

export { champDef };

function priority(c: Champion, action: CombatAction, usedUlt: boolean): number {
  let p = c.stats.attackSpeed * 100 + c.stats.moveSpeed;
  if (hasItem(c, 'dagger')) p += 50;
  if (action === 'attack') p += 10;
  if (usedUlt && c.defId === 'kayn' && action === 'attack') p += 200;
  return p;
}

function pushLog(log: CombatLogLine[], text: string, tone: CombatLogLine['tone'] = 'neutral') {
  log.push({ id: logId(), text, tone });
}

function living(team: TeamData) {
  return team.champions.filter(c => c.isAlive && c.stats.hp > 0 && (c.skipTurns || 0) <= 0);
}

function livingIncludingSkipped(team: TeamData) {
  return team.champions.filter(c => c.isAlive && c.stats.hp > 0);
}

/** Jungla listo para actuar este turno (vivo, con HP y sin skip). */
export function livingJungler(team: TeamData): Champion | null {
  return living(team).find(c => champDef(c).role === 'jungle') || null;
}

/**
 * Si la jungla no puede actuar, anula gank/objetivo.
 * Evita planes “fantasma” que mueven pelea o abren QTE sin jungla.
 */
function sanitizeJunglePlan(plan: TeamPlan, team: TeamData): TeamPlan {
  if (livingJungler(team)) return plan;
  if (plan.jungleTarget === undefined && !plan.objectiveAssistId) return plan;
  return {
    ...plan,
    jungleTarget: undefined,
    objectiveAssistId: undefined,
  };
}

function applyBurn(champs: Champion[], log: CombatLogLine[]) {
  for (const c of champs) {
    if (!c.isAlive || c.burnPending <= 0) continue;
    c.stats.hp = Math.max(0, c.stats.hp - c.burnPending);
    pushLog(log, `${champDef(c).name} sufre ${c.burnPending} de quema`, 'neutral');
    c.burnPending = 0;
    if (c.stats.hp <= 0) {
      c.isAlive = false;
      pushLog(log, `${champDef(c).name} muere por la quema`, 'kill');
    }
  }
}

function dealDamage(attacker: Champion, defender: Champion, raw: number, magic: boolean): number {
  let dmg = raw;
  if (magic && hasItem(defender, 'null_magic')) dmg = Math.max(5, dmg - 40);
  const mit = magic
    ? defender.stats.mr / (defender.stats.mr + 100)
    : defender.stats.armor / (defender.stats.armor + 100);
  dmg = Math.max(8, Math.floor(dmg * (1 - mit)));
  defender.stats.hp = Math.max(0, defender.stats.hp - dmg);
  if (attacker.lifeSteal > 0 && dmg > 0 && attacker.isAlive) {
    const heal = Math.floor(dmg * attacker.lifeSteal);
    if (heal > 0) {
      attacker.stats.hp = Math.min(attacker.stats.maxHp, attacker.stats.hp + heal);
    }
  }
  return dmg;
}

function actionDamage(c: Champion, action: CombatAction, teamBuff: number, tearDouble: boolean): { dmg: number; magic: boolean } {
  if (action === 'defend') return { dmg: 0, magic: false };
  const sideMul = c.team === 'red' ? AI_DAMAGE_MULT : 1;
  if (action === 'attack') {
    let dmg = Math.floor((c.stats.ad * 1.15 * COMBAT_DAMAGE_MULT + 40 * COMBAT_DAMAGE_MULT) * sideMul) + teamBuff;
    if (hasItem(c, 'long_sword')) dmg += Math.floor(45 * COMBAT_DAMAGE_MULT * sideMul);
    return { dmg, magic: false };
  }
  // ability
  let dmg = Math.floor((c.stats.ap * 1.35 * COMBAT_DAMAGE_MULT + 50 * COMBAT_DAMAGE_MULT) * sideMul) + teamBuff;
  if (hasItem(c, 'blasting_wand')) dmg += Math.floor(55 * COMBAT_DAMAGE_MULT * sideMul);
  if (tearDouble) dmg *= 2;
  return { dmg, magic: true };
}

type Fighter = { champ: Champion; action: CombatAction; ult: boolean; lane: number };

function fighterSnap(f: Fighter, hpBefore: number, damageDealt: number): DuelFighterSummary {
  return {
    instanceId: f.champ.instanceId,
    name: champDef(f.champ).name,
    image: champDef(f.champ).image,
    action: f.action,
    usedUlt: f.ult,
    hpBefore,
    hpAfter: Math.max(0, Math.floor(f.champ.stats.hp)),
    maxHp: f.champ.stats.maxHp,
    isAlive: f.champ.isAlive && f.champ.stats.hp > 0,
    damageDealt,
  };
}

function resolveDuel(
  a: Fighter,
  b: Fighter,
  state: TurnMatchState,
  log: CombatLogLine[],
  duels: DuelSummary[],
  floats: CombatFloat[],
  lane: LaneId,
  killEvents: RawKill[],
): { blueKill: boolean; redKill: boolean } {
  let blueKill = false;
  let redKill = false;

  const hpA = a.champ.stats.hp;
  const hpB = b.champ.stats.hp;
  let dmgByA = 0;
  let dmgByB = 0;
  const notes: string[] = [];

  // Ult effects pre
  if (a.ult && (a.champ.defId === 'amumu' || a.champ.defId === 'sejuani') && b.action === 'defend') b.action = 'attack';
  if (b.ult && (b.champ.defId === 'amumu' || b.champ.defId === 'sejuani') && a.action === 'defend') a.action = 'attack';
  if (a.ult && a.champ.defId === 'leona' && b.action === 'attack') b.action = 'defend';
  if (b.ult && b.champ.defId === 'leona' && a.action === 'attack') a.action = 'defend';
  if (a.ult && (a.champ.defId === 'thresh' || a.champ.defId === 'nautilus')) b.champ.stats.armor = Math.max(5, b.champ.stats.armor - 20);
  if (b.ult && (b.champ.defId === 'thresh' || b.champ.defId === 'nautilus')) a.champ.stats.armor = Math.max(5, a.champ.stats.armor - 20);

  const order = [a, b].sort((x, y) => priority(y.champ, y.action, y.ult) - priority(x.champ, x.action, x.ult));

  for (let exchange = 0; exchange < DUEL_MAX_EXCHANGES; exchange++) {
    if (!a.champ.isAlive || a.champ.stats.hp <= 0 || !b.champ.isAlive || b.champ.stats.hp <= 0) break;

  for (const atk of order) {
    if (!atk.champ.isAlive || atk.champ.stats.hp <= 0) continue;
    const def = atk === a ? b : a;
    if (!def.champ.isAlive) continue;

    const effectiveAction: CombatAction = exchange > 0 && atk.action === 'defend' ? 'attack' : atk.action;

    let tearDouble = false;
    if (effectiveAction === 'ability' && hasItem(atk.champ, 'tear')) {
      atk.champ.tearStacks += 1;
      if (atk.champ.tearStacks >= 5) {
        tearDouble = true;
        atk.champ.tearStacks = 0;
        pushLog(log, `${champDef(atk.champ).name} descarga la Lágrima (×2)`, 'ulti');
      }
    }

    const team = atk.champ.team === 'blue' ? state.blue : state.red;
    let { dmg, magic } = actionDamage(atk.champ, effectiveAction, team.damageBuff, tearDouble);

    if (atk.ult && (atk.champ.defId === 'lux' || atk.champ.defId === 'syndra') && effectiveAction === 'ability') dmg = Math.floor(dmg * 1.5);
    if (atk.ult && (atk.champ.defId === 'vi' || atk.champ.defId === 'sett') && effectiveAction === 'attack') dmg += 50;
    if (atk.ult && atk.champ.defId === 'aatrox' && effectiveAction === 'attack') dmg += 55;
    if (atk.ult && atk.champ.defId === 'graves' && effectiveAction === 'attack') dmg += 45;
    if (atk.ult && atk.champ.defId === 'ezreal' && effectiveAction === 'ability') dmg += 35;
    if (atk.ult && atk.champ.defId === 'orianna' && effectiveAction === 'ability') dmg += 40;
    if (atk.ult && atk.champ.defId === 'jinx' && effectiveAction === 'ability') dmg += atk.champ.kills * 15;
    if (atk.ult && atk.champ.defId === 'lee_sin') dmg += 40;
    if (atk.ult && atk.champ.defId === 'garen' && effectiveAction === 'attack') {
      dmg = Math.floor(dmg * 1.25);
    }
    if (atk.ult && atk.champ.defId === 'generic') dmg += 25;

    if (champDef(atk.champ).passive.id === 'execute' && def.champ.stats.hp / def.champ.stats.maxHp < 0.12) {
      dmg = def.champ.stats.hp;
      pushLog(log, `${champDef(atk.champ).name} ejecuta`, 'kill');
    }
    if (atk.ult && (atk.champ.defId === 'kaisa' || atk.champ.defId === 'jhin') && effectiveAction === 'attack' && def.champ.stats.hp / def.champ.stats.maxHp < 0.35) {
      dmg = def.champ.stats.hp;
      pushLog(log, `${champDef(atk.champ).name} ejecuta por instinto`, 'ulti');
    }

    if (effectiveAction === 'defend') {
      pushLog(log, `${champDef(atk.champ).name} elige Defender y no ataca`);
      notes.push(`${champDef(atk.champ).name} defiende`);
      continue;
    }

    let mitigated = dmg;
    const ignoreDefend = (atk.ult && (atk.champ.defId === 'caitlyn' || atk.champ.defId === 'ashe') && effectiveAction === 'attack')
      || (champDef(atk.champ).passive.id === 'headshot' && Math.random() < 0.15);
    if (def.action === 'defend' && exchange === 0 && !ignoreDefend) {
      if (def.ult && def.champ.defId === 'malphite') {
        mitigated = 0;
        pushLog(log, `${champDef(def.champ).name} anula el golpe (Inquebrantable)`, 'ulti');
      } else {
        mitigated = Math.floor(dmg * DEFEND_DAMAGE_MULT);
        pushLog(log, `${champDef(def.champ).name} Defiende y reduce el golpe a ${mitigated}`);
      }
    }
    if (ignoreDefend && def.action === 'defend') {
      pushLog(log, `${champDef(atk.champ).name} ignora la defensa`, 'ulti');
    }

    const dealt = dealDamage(atk.champ, def.champ, mitigated, magic);
    if (atk === a) dmgByA += dealt;
    else dmgByB += dealt;

    if (dealt > 0) {
      pushFloat(floats, {
        kind: 'damage',
        amount: dealt,
        targetType: 'champ',
        targetId: def.champ.instanceId,
        sourceName: champDef(atk.champ).name,
        sourceId: atk.champ.instanceId,
        sourceTeam: atk.champ.team,
        targetName: champDef(def.champ).name,
        targetTeam: def.champ.team,
        lane,
      });
    }

    const dmgType = magic ? 'daño mágico' : 'daño físico';
    pushLog(
      log,
      `${champDef(atk.champ).name} ${actionLabelEs(effectiveAction)} a ${champDef(def.champ).name} · ${dealt} de ${dmgType}`,
    );
    notes.push(
      `${champDef(atk.champ).name} ${actionLabelEs(effectiveAction).toLowerCase()}, ${champDef(def.champ).name}${
        def.action === 'defend' && exchange === 0 ? ' defiende' : ''
      } → ${dealt} dmg`,
    );

    if (effectiveAction === 'attack' && hasItem(atk.champ, 'cloth_armor')) {
      def.champ.burnPending += BURN_ARMOR_DMG;
    }

    if (atk.ult && atk.champ.defId === 'yasuo' && effectiveAction === 'attack' && def.champ.isAlive && def.champ.stats.hp > 0) {
      const second = dealDamage(atk.champ, def.champ, Math.floor(mitigated * 0.6), false);
      if (atk === a) dmgByA += second;
      else dmgByB += second;
      if (second > 0) {
        pushFloat(floats, {
          kind: 'damage',
          amount: second,
          targetType: 'champ',
          targetId: def.champ.instanceId,
          sourceName: champDef(atk.champ).name,
          sourceId: atk.champ.instanceId,
          sourceTeam: atk.champ.team,
          targetName: champDef(def.champ).name,
          targetTeam: def.champ.team,
          lane,
        });
      }
      pushLog(log, `${champDef(atk.champ).name} Segundo Aliento: +${second}`, 'ulti');
    }

    if (def.champ.stats.hp <= 0) {
      def.champ.isAlive = false;
      atk.champ.kills += 1;
      atk.champ.gold += GOLD_PER_KILL;
      if (atk.champ.team === 'blue') {
        state.blue.kills += 1;
        state.blue.score += POINTS_KILL;
        blueKill = true;
      } else {
        state.red.kills += 1;
        state.red.score += POINTS_KILL;
        redKill = true;
      }
      pushLog(log, `¡${champDef(atk.champ).name} elimina a ${champDef(def.champ).name}! (+1 baja)`, 'kill');
      notes.push(`${champDef(def.champ).name} KO`);
      pushKill(killEvents, atk.champ, def.champ);

      if (atk.ult && atk.champ.defId === 'darius') {
        const hpBeforeHeal = atk.champ.stats.hp;
        atk.champ.stats.hp = Math.min(atk.champ.stats.maxHp, atk.champ.stats.hp + 80);
        const healed = atk.champ.stats.hp - hpBeforeHeal;
        if (healed > 0) {
          pushFloat(floats, {
            kind: 'heal',
            amount: healed,
            targetType: 'champ',
            targetId: atk.champ.instanceId,
            sourceName: champDef(atk.champ).name,
            sourceId: atk.champ.instanceId,
            sourceTeam: atk.champ.team,
            targetName: champDef(atk.champ).name,
            targetTeam: atk.champ.team,
            lane,
          });
          pushLog(log, `${champDef(atk.champ).name} se cura ${healed}`, 'ulti');
        }
      }
    } else if (atk.ult && atk.champ.defId === 'zed') {
      def.champ.stats.hp = Math.max(0, def.champ.stats.hp - 30);
      if (atk === a) dmgByA += 30;
      else dmgByB += 30;
      pushFloat(floats, {
        kind: 'damage',
        amount: 30,
        targetType: 'champ',
        targetId: def.champ.instanceId,
        sourceName: champDef(atk.champ).name,
        sourceId: atk.champ.instanceId,
        sourceTeam: atk.champ.team,
        targetName: champDef(def.champ).name,
        targetTeam: def.champ.team,
        lane,
      });
      pushLog(log, `Marca Mortal: +30 a ${champDef(def.champ).name}`, 'ulti');
      if (def.champ.stats.hp <= 0) {
        def.champ.isAlive = false;
        atk.champ.kills += 1;
        atk.champ.gold += GOLD_PER_KILL;
        if (atk.champ.team === 'blue') { state.blue.kills++; state.blue.score += POINTS_KILL; blueKill = true; }
        else { state.red.kills++; state.red.score += POINTS_KILL; redKill = true; }
        pushLog(log, `${champDef(def.champ).name} cae por la marca`, 'kill');
        notes.push(`${champDef(def.champ).name} KO`);
        pushKill(killEvents, atk.champ, def.champ);
      }
    }
  }
  } // end exchanges

  const blueF = a.champ.team === 'blue' ? a : b;
  const redF = a.champ.team === 'red' ? a : b;
  const blueDmg = a.champ.team === 'blue' ? dmgByA : dmgByB;
  const redDmg = a.champ.team === 'red' ? dmgByA : dmgByB;
  const blueHpBefore = a.champ.team === 'blue' ? hpA : hpB;
  const redHpBefore = a.champ.team === 'red' ? hpA : hpB;

  duels.push({
    id: duelId(),
    lane,
    kind: 'duel',
    blue: fighterSnap(blueF, blueHpBefore, blueDmg),
    red: fighterSnap(redF, redHpBefore, redDmg),
    summary: notes[0] || `${champDef(blueF.champ).name} vs ${champDef(redF.champ).name}`,
  });

  return { blueKill, redKill };
}

/**
 * Golpe de superioridad numérica (2v1, 3v1…): el extra enfoca al rival
 * sin pelea justa 1v1. En 3v1 es muy probable que caiga.
 */
function resolveFocusStrike(
  atk: Fighter,
  def: Fighter,
  state: TurnMatchState,
  log: CombatLogLine[],
  duels: DuelSummary[],
  floats: CombatFloat[],
  lane: LaneId,
  killEvents: RawKill[],
  allyCount: number,
  enemyCount: number,
): { blueKill: boolean; redKill: boolean } {
  let blueKill = false;
  let redKill = false;
  if (!atk.champ.isAlive || atk.champ.stats.hp <= 0) return { blueKill, redKill };
  if (!def.champ.isAlive || def.champ.stats.hp <= 0) return { blueKill, redKill };

  const ratio = allyCount / Math.max(1, enemyCount);
  // 2v1 ≈ 1.55× · 3v1 ≈ 1.95× · 4v1+ tope 2.35×
  const pileMult = Math.min(2.35, 1.15 + ratio * 0.4);
  const executeChance = ratio >= 3 ? 0.88 : ratio >= 2 ? 0.58 : 0.28;

  const hpBeforeAtk = atk.champ.stats.hp;
  const hpBeforeDef = def.champ.stats.hp;
  const team = atk.champ.team === 'blue' ? state.blue : state.red;
  const action: CombatAction = atk.action === 'defend' ? 'attack' : atk.action;
  let { dmg, magic } = actionDamage(atk.champ, action, team.damageBuff, false);
  dmg = Math.floor(dmg * pileMult);

  // Defensa parcial: en superioridad numérica Defender ayuda menos
  if (def.action === 'defend') {
    dmg = Math.floor(dmg * Math.max(0.35, DEFEND_DAMAGE_MULT + 0.15));
  }

  // Ejecución casi segura en 3v1+ si sigue vivo tras el golpe base
  const willExecute = Math.random() < executeChance;
  if (willExecute && def.champ.stats.hp <= dmg * 1.35) {
    dmg = Math.max(dmg, def.champ.stats.hp);
  }

  const dealt = dealDamage(atk.champ, def.champ, dmg, magic);
  if (dealt > 0) {
    pushFloat(floats, {
      kind: 'damage',
      amount: dealt,
      targetType: 'champ',
      targetId: def.champ.instanceId,
      sourceName: champDef(atk.champ).name,
      sourceId: atk.champ.instanceId,
      sourceTeam: atk.champ.team,
      targetName: champDef(def.champ).name,
      targetTeam: def.champ.team,
      lane,
    });
  }

  const oddsLabel = ratio >= 3 ? '3 vs 1' : ratio >= 2 ? '2 vs 1' : 'superioridad';
  pushLog(
    log,
    `${champDef(atk.champ).name} enfoca a ${champDef(def.champ).name} (${oddsLabel}) · ${dealt} de daño`,
    'kill',
  );

  // Si sobrevivió el primer golpe pero la superioridad es grande, remate
  if (def.champ.isAlive && def.champ.stats.hp > 0 && ratio >= 3 && Math.random() < 0.72) {
    const finish = dealDamage(atk.champ, def.champ, def.champ.stats.hp, false);
    if (finish > 0) {
      pushFloat(floats, {
        kind: 'damage',
        amount: finish,
        targetType: 'champ',
        targetId: def.champ.instanceId,
        sourceName: champDef(atk.champ).name,
        sourceId: atk.champ.instanceId,
        sourceTeam: atk.champ.team,
        targetName: champDef(def.champ).name,
        targetTeam: def.champ.team,
        lane,
      });
      pushLog(log, `${champDef(atk.champ).name} remata por superioridad numérica`, 'kill');
    }
  }

  if (def.champ.stats.hp <= 0) {
    def.champ.isAlive = false;
    atk.champ.kills += 1;
    atk.champ.gold += GOLD_PER_KILL;
    if (atk.champ.team === 'blue') {
      state.blue.kills += 1;
      state.blue.score += POINTS_KILL;
      blueKill = true;
    } else {
      state.red.kills += 1;
      state.red.score += POINTS_KILL;
      redKill = true;
    }
    pushLog(log, `¡${champDef(atk.champ).name} elimina a ${champDef(def.champ).name}! (+1 baja)`, 'kill');
    pushKill(killEvents, atk.champ, def.champ);
  }

  const blueF = atk.champ.team === 'blue' ? atk : def;
  const redF = atk.champ.team === 'red' ? atk : def;
  duels.push({
    id: duelId(),
    lane,
    kind: 'duel',
    blue: fighterSnap(
      blueF,
      atk.champ.team === 'blue' ? hpBeforeAtk : hpBeforeDef,
      atk.champ.team === 'blue' ? dealt : 0,
    ),
    red: fighterSnap(
      redF,
      atk.champ.team === 'red' ? hpBeforeAtk : hpBeforeDef,
      atk.champ.team === 'red' ? dealt : 0,
    ),
    summary: `${champDef(atk.champ).name} enfoca (${oddsLabel}) a ${champDef(def.champ).name}`,
  });

  return { blueKill, redKill };
}

function fightersInLane(
  state: TurnMatchState,
  lane: LaneId,
  bluePlan: TeamPlan,
  redPlan: TeamPlan,
  skipJungles = false,
): { blue: Fighter[]; red: Fighter[] } {
  const collect = (team: TeamData, plan: TeamPlan): Fighter[] => {
    const out: Fighter[] = [];
    for (const c of living(team)) {
      const def = champDef(c);
      // Ally helping jungle on objective leaves their lane
      if (plan.jungleTarget === 'objective' && plan.objectiveAssistId === c.instanceId) continue;
      let laneNow = c.position.lane as number;
      if (plan.bootsLane?.[c.instanceId] !== undefined && hasItem(c, 'boots')) {
        laneNow = plan.bootsLane[c.instanceId];
      }
      if (def.role === 'jungle') {
        const jt = plan.jungleTarget;
        // Sin plan de jungla (muerto / skip): no entra a pelear en línea este turno
        if (jt === undefined || jt === null) continue;
        if (jt === 'objective') continue; // handled separately
        if (skipJungles) continue; // pelean en QTE de gank contested
        if (typeof jt === 'number') laneNow = jt;
        else continue;
      }
      if (laneNow !== lane) continue;
      const action = plan.actions[c.instanceId] || 'attack';
      const ult = plan.ultimates.includes(c.instanceId);
      out.push({ champ: c, action, ult, lane: laneNow });
    }
    return out;
  };
  return { blue: collect(state.blue, bluePlan), red: collect(state.red, redPlan) };
}

function resolveLaneGroup(
  state: TurnMatchState,
  lane: LaneId,
  bluePlan: TeamPlan,
  redPlan: TeamPlan,
  log: CombatLogLine[],
  duels: DuelSummary[],
  floats: CombatFloat[],
  towerStats: { blue: number; red: number },
  killEvents: RawKill[],
  skipJungles = false,
  siegeCtx?: SiegeCtx,
) {
  const { blue, red } = fightersInLane(state, lane, bluePlan, redPlan, skipJungles);
  if (blue.length === 0 && red.length === 0) return;

  pushLog(log, `— Línea ${laneLabel(lane)} —`, 'section');

  for (const f of [...blue, ...red]) {
    if (!f.ult) continue;
    const team = f.champ.team === 'blue' ? state.blue : state.red;
    if (f.champ.defId === 'soraka') {
      for (const a of living(team)) {
        const hpBeforeHeal = a.stats.hp;
        a.stats.hp = Math.min(a.stats.maxHp, a.stats.hp + 100);
        const healed = a.stats.hp - hpBeforeHeal;
        if (healed > 0) {
          pushFloat(floats, {
            kind: 'heal',
            amount: healed,
            targetType: 'champ',
            targetId: a.instanceId,
            sourceName: champDef(f.champ).name,
            sourceId: f.champ.instanceId,
            sourceTeam: f.champ.team,
            targetName: champDef(a).name,
            targetTeam: a.team,
            lane,
          });
        }
      }
      pushLog(log, `${champDef(f.champ).name} usa Deseo y cura al equipo`, 'ulti');
    }
    if (f.champ.defId === 'lulu' || f.champ.defId === 'yuumi' || f.champ.defId === 'shen') {
      const ally = living(team).filter(x => x.instanceId !== f.champ.instanceId)
        .sort((x, y) => (x.stats.hp / x.stats.maxHp) - (y.stats.hp / y.stats.maxHp))[0];
      if (ally) {
        if (f.champ.defId === 'lulu' || f.champ.defId === 'yuumi') {
          const hpBeforeHeal = ally.stats.hp;
          ally.stats.hp = Math.min(ally.stats.maxHp, ally.stats.hp + 120);
          const healed = ally.stats.hp - hpBeforeHeal;
          if (healed > 0) {
            pushFloat(floats, {
              kind: 'heal',
              amount: healed,
              targetType: 'champ',
              targetId: ally.instanceId,
              sourceName: champDef(f.champ).name,
              sourceId: f.champ.instanceId,
              sourceTeam: f.champ.team,
              targetName: champDef(ally).name,
              targetTeam: ally.team,
              lane,
            });
          }
          pushLog(log, `${champDef(f.champ).name} escuda a ${champDef(ally).name}`, 'ulti');
        }
        if (f.champ.defId === 'shen') {
          const plan = f.champ.team === 'blue' ? bluePlan : redPlan;
          plan.actions[ally.instanceId] = 'defend';
          pushLog(log, `Unidos Permaneceremos protege a ${champDef(ally).name}`, 'ulti');
        }
      }
    }
  }

  const pairedBlue = new Set<string>();
  const pairedRed = new Set<string>();
  const redPool = [...red];

  // 1) Emparejar 1v1 mientras haya rivales
  for (const bf of blue) {
    const enemy = redPool.find(r =>
      r.champ.isAlive && r.champ.stats.hp > 0 && !pairedRed.has(r.champ.instanceId),
    );
    if (!enemy) break;
    pairedBlue.add(bf.champ.instanceId);
    pairedRed.add(enemy.champ.instanceId);
    resolveDuel(bf, enemy, state, log, duels, floats, lane, killEvents);
  }

  // 2) Superioridad numérica: los sobrantes enfocan al rival (3v1 muy letal)
  const blueExtras = blue.filter(
    f => !pairedBlue.has(f.champ.instanceId) && f.champ.isAlive && f.champ.stats.hp > 0,
  );
  const redExtras = red.filter(
    f => !pairedRed.has(f.champ.instanceId) && f.champ.isAlive && f.champ.stats.hp > 0,
  );

  const focusExtras = (extras: Fighter[], enemies: Fighter[], allyTotal: number, enemyTotal: number) => {
    for (const atk of extras) {
      if (!atk.champ.isAlive || atk.champ.stats.hp <= 0) continue;
      const target = enemies.find(e => e.champ.isAlive && e.champ.stats.hp > 0);
      if (target) {
        resolveFocusStrike(
          atk, target, state, log, duels, floats, lane, killEvents, allyTotal, enemyTotal,
        );
      } else {
        // Sin contrincante: siempre asedia torre/nexo (errores de carril)
        const towerTeam: TeamColor = atk.champ.team === 'blue' ? 'red' : 'blue';
        siegeTower(state, towerTeam, lane, atk.champ, log, duels, floats, towerStats, siegeCtx);
      }
    }
  };

  focusExtras(blueExtras, red, blue.length, red.length);
  focusExtras(redExtras, blue, red.length, blue.length);

  // Si un bando limpió la línea, quienes pelearon 1v1 y siguen vivos asedian sí o sí
  const redLeft = red.some(r => r.champ.isAlive && r.champ.stats.hp > 0);
  const blueLeft = blue.some(b => b.champ.isAlive && b.champ.stats.hp > 0);
  if (!redLeft) {
    for (const bf of blue) {
      if (!bf.champ.isAlive || bf.champ.stats.hp <= 0) continue;
      if (!pairedBlue.has(bf.champ.instanceId)) continue; // extras ya asediaron si no había blanco
      siegeTower(state, 'red', lane, bf.champ, log, duels, floats, towerStats, siegeCtx);
    }
  }
  if (!blueLeft) {
    for (const rf of red) {
      if (!rf.champ.isAlive || rf.champ.stats.hp <= 0) continue;
      if (!pairedRed.has(rf.champ.instanceId)) continue;
      siegeTower(state, 'blue', lane, rf.champ, log, duels, floats, towerStats, siegeCtx);
    }
  }
}

function calcSiegeDamage(sieger: Champion, base: number, target: 'tower' | 'nexus'): number {
  let dmg = base;
  const passive = champDef(sieger).passive?.id;
  if (passive === 'blast') dmg = Math.floor(dmg * 1.3);
  if (passive === 'fortify' && target === 'tower') dmg = Math.floor(dmg * 1.25);
  return dmg;
}

function siegeTower(
  state: TurnMatchState,
  towerTeam: TeamColor,
  lane: LaneId,
  sieger: Champion,
  log: CombatLogLine[],
  duels: DuelSummary[],
  floats: CombatFloat[],
  towerStats: { blue: number; red: number },
  siegeCtx?: SiegeCtx,
) {
  const siegerSnap: DuelFighterSummary = {
    instanceId: sieger.instanceId,
    name: champDef(sieger).name,
    image: champDef(sieger).image,
    action: 'attack',
    usedUlt: false,
    hpBefore: Math.floor(sieger.stats.hp),
    hpAfter: Math.floor(sieger.stats.hp),
    maxHp: sieger.stats.maxHp,
    isAlive: true,
    damageDealt: 0,
  };

  const tower = state.structures.find(s => s.type === 'tower' && s.team === towerTeam && s.lane === lane && !s.isDestroyed);
  if (!tower) {
    const nexus = state.structures.find(s => s.type === 'nexus' && s.team === towerTeam && !s.isDestroyed);
    if (nexus) {
      const raw = calcSiegeDamage(sieger, SIEGE_NEXUS_DMG, 'nexus');
      let dmg = Math.min(raw, nexus.hp);

      // Golpe letal al nexo del jugador → diferir destrucción a QTE de defensa
      if (
        towerTeam === 'blue'
        && sieger.team === 'red'
        && siegeCtx
        && nexus.hp - dmg <= 0
      ) {
        // Deja el nexo a 1 HP y marca amenaza → QTE de defensa
        const applied = Math.max(0, nexus.hp - 1);
        nexus.hp = 1;
        siegerSnap.damageDealt = applied;
        pushFloat(floats, {
          kind: 'damage',
          amount: applied,
          targetType: 'nexus',
          targetId: nexus.id,
          sourceName: champDef(sieger).name,
          sourceId: sieger.instanceId,
          sourceTeam: sieger.team,
          targetName: structureTargetName('nexus', lane),
          targetTeam: towerTeam,
          lane,
        });
        pushLog(
          log,
          `¡${champDef(sieger).name} asalta el Nexo! Defiende o cae la base`,
          'tower',
        );
        duels.push({
          id: duelId(),
          lane,
          kind: 'siege',
          blue: undefined,
          red: siegerSnap,
          summary: `${champDef(sieger).name} asalta el Nexo — ¡defiende!`,
          siegeTargetId: nexus.id,
        });
        state.blue.nexusHp = 1;
        siegeCtx.blueNexusThreat = { siegerId: sieger.instanceId, lane };
        return;
      }

      nexus.hp = Math.max(0, nexus.hp - dmg);
      siegerSnap.damageDealt = dmg;
      pushFloat(floats, {
        kind: 'damage',
        amount: dmg,
        targetType: 'nexus',
        targetId: nexus.id,
        sourceName: champDef(sieger).name,
        sourceId: sieger.instanceId,
        sourceTeam: sieger.team,
        targetName: structureTargetName('nexus', lane),
        targetTeam: towerTeam,
        lane,
      });
      pushLog(log, `${champDef(sieger).name} golpea el Nexo · ${dmg} de daño (${nexus.hp}/${nexus.maxHp})`);
      duels.push({
        id: duelId(),
        lane,
        kind: 'siege',
        blue: sieger.team === 'blue' ? siegerSnap : undefined,
        red: sieger.team === 'red' ? siegerSnap : undefined,
        summary: `${champDef(sieger).name} asedia el Nexo (−${dmg})`,
        siegeTargetId: nexus.id,
      });
      if (nexus.hp <= 0) {
        nexus.isDestroyed = true;
        const team = towerTeam === 'blue' ? state.blue : state.red;
        team.nexusHp = 0;
        pushLog(log, `¡NEXO DESTRUIDO por ${champDef(sieger).name}! Victoria automática`, 'tower');
      } else {
        const team = towerTeam === 'blue' ? state.blue : state.red;
        team.nexusHp = nexus.hp;
      }
    }
    return;
  }

  const raw = calcSiegeDamage(sieger, SIEGE_TOWER_DMG, 'tower');
  const dmg = Math.min(raw, tower.hp);
  tower.hp = Math.max(0, tower.hp - dmg);
  siegerSnap.damageDealt = dmg;
  pushFloat(floats, {
    kind: 'damage',
    amount: dmg,
    targetType: 'tower',
    targetId: tower.id,
    sourceName: champDef(sieger).name,
    sourceId: sieger.instanceId,
    sourceTeam: sieger.team,
    targetName: structureTargetName('tower', lane),
    targetTeam: towerTeam,
    lane,
  });
  pushLog(log, `${champDef(sieger).name} asedia la torre ${laneLabel(lane)} · ${dmg} de daño (${tower.hp}/${tower.maxHp})`);
  let summary = `${champDef(sieger).name} asedia torre ${laneLabel(lane)} (−${dmg})`;
  let towerFell = false;
  if (tower.hp <= 0) {
    tower.isDestroyed = true;
    towerFell = true;
    if (sieger.team === 'blue') {
      state.blue.score += POINTS_TOWER;
      towerStats.blue += 1;
    } else {
      state.red.score += POINTS_TOWER;
      towerStats.red += 1;
    }
    pushLog(log, `¡Torreta destruida! (${sieger.team === 'blue' ? state.blue.name : state.red.name})`, 'tower');
    summary = `${champDef(sieger).name} destruye la torre ${laneLabel(lane)}`;
  }
  duels.push({
    id: duelId(),
    lane,
    kind: 'siege',
    blue: sieger.team === 'blue' ? siegerSnap : undefined,
    red: sieger.team === 'red' ? siegerSnap : undefined,
    summary,
    siegeTargetId: tower.id,
  });
  // Al tumbar la torre, el mismo golpe sigue al nexo (empuje de línea libre)
  if (towerFell) {
    siegeTower(state, towerTeam, lane, sieger, log, duels, floats, towerStats, siegeCtx);
  }
}

function objectiveParticipants(team: TeamData, plan: TeamPlan): Champion[] {
  const list: Champion[] = [];
  for (const c of living(team)) {
    const def = champDef(c);
    if (def.role === 'jungle' && plan.jungleTarget === 'objective') list.push(c);
    else if (plan.jungleTarget === 'objective' && plan.objectiveAssistId === c.instanceId) list.push(c);
  }
  return list;
}

function grantObjectiveRewards(
  state: TurnMatchState,
  winner: TeamColor,
  obj: NonNullable<ObjectiveType>,
  log: CombatLogLine[],
): { freeItem: boolean; ancestral: boolean; bonus: ObjectiveBonusAnnounce } {
  const name = objectiveName(obj);
  const wTeam = winner === 'blue' ? state.blue : state.red;
  wTeam.score += POINTS_OBJECTIVE;
  const recipients = living(wTeam);
  const recipientNames = recipients.map(c => champDef(c).name);

  let bonusText = '';
  if (obj === 'dragon_water') {
    bonusText = '+15% de Maná a todos los campeones aliados vivos';
    for (const c of recipients) {
      const bonus = Math.max(1, Math.floor(c.stats.maxMana * 0.15));
      c.stats.maxMana += bonus;
      c.stats.mana = Math.min(c.stats.maxMana, c.stats.mana + bonus);
    }
  } else if (obj === 'dragon_fire') {
    bonusText = '+15% de vida a todos los campeones aliados vivos';
    for (const c of recipients) {
      const bonus = Math.max(1, Math.floor(c.stats.maxHp * 0.15));
      c.stats.maxHp += bonus;
      c.stats.hp = Math.min(c.stats.maxHp, c.stats.hp + bonus);
    }
  } else if (obj === 'baron') {
    bonusText = '+10% de daño físico y +10% de daño mágico a campeones aliados vivos';
    for (const c of recipients) {
      c.stats.ad = Math.max(1, Math.floor(c.stats.ad * 1.1));
      c.stats.ap = Math.max(1, Math.floor(c.stats.ap * 1.1));
    }
  } else {
    bonusText = '+15% de robo de vida a todos los campeones aliados vivos (15% del daño a enemigos se cura)';
    for (const c of recipients) {
      c.lifeSteal = Math.min(0.6, (c.lifeSteal || 0) + 0.15);
    }
  }

  pushLog(log, `${wTeam.name} conquista el ${name}! ${bonusText}`, 'objective');
  grantFreeItemToTeam(wTeam, log);

  return {
    freeItem: true,
    ancestral: obj === 'dragon_ancestral',
    bonus: {
      id: announceId(),
      objective: obj,
      title: name,
      bonusText,
      recipients: recipientNames,
      team: winner,
      teamName: wTeam.name,
    },
  };
}

/** Aplica objetivo con resultado del QTE (o auto). */
export function applyObjectiveWithQte(
  state: TurnMatchState,
  bluePlan: TeamPlan,
  redPlan: TeamPlan,
  qte: { skirmishWinner: TeamColor | null; attackingTeam: TeamColor; monsterTaken: boolean } | null,
): {
  winner: TeamColor | null;
  contested: boolean;
  freeItem: boolean;
  ancestral: boolean;
  bonus: ObjectiveBonusAnnounce | null;
  log: CombatLogLine[];
  duels: DuelSummary[];
  floats: CombatFloat[];
  kills: RawKill[];
} {
  const log: CombatLogLine[] = [];
  const duels: DuelSummary[] = [];
  const floats: CombatFloat[] = [];
  const kills: RawKill[] = [];
  if (!state.objective) {
    return { winner: null, contested: false, freeItem: false, ancestral: false, bonus: null, log, duels, floats, kills };
  }
  const obj = state.objective;
  const name = objectiveName(obj);
  const blueP = objectiveParticipants(state.blue, bluePlan);
  const redP = objectiveParticipants(state.red, redPlan);
  pushLog(log, `— Objetivo: ${name} —`, 'section');

  if (blueP.length === 0 && redP.length === 0) {
    pushLog(log, `${name}: nadie lo contestó esta ronda`);
    return { winner: null, contested: false, freeItem: false, ancestral: false, bonus: null, log, duels, floats, kills };
  }

  const contested = blueP.length > 0 && redP.length > 0;
  if (contested) {
    pushLog(log, `¡Rivalidad! Ambos equipos pelean por el ${name}`, 'objective');
  } else {
    pushLog(log, `¡Asalto al ${name}!`, 'objective');
  }

  let winner: TeamColor | null = null;

  if (qte) {
    if (contested && qte.skirmishWinner) {
      pushLog(log, `Escaramuza: gana el equipo ${qte.skirmishWinner === 'blue' ? 'azul' : 'rojo'}`, 'objective');
    }
    if (qte.monsterTaken) {
      winner = qte.attackingTeam;
    } else {
      pushLog(log, `El ${name} resiste el asalto`);
      if (contested) {
        winner = qte.attackingTeam === 'blue' ? 'red' : 'blue';
        pushLog(log, `El otro equipo aprovecha y se lleva el ${name}`, 'objective');
      } else {
        winner = null;
      }
    }
  } else {
    // Auto (IA sola o fallback)
    const power = (arr: Champion[]) => arr.reduce((s, c) => s + c.stats.ad + c.stats.ap + c.stats.hp * 0.08, 0);
    let bp = power(blueP);
    let rp = power(redP);
    const objHp = contested ? 420 : 280;
    if (blueP.length > 0 && redP.length === 0) {
      if (bp < objHp * 0.35) {
        pushLog(log, `El equipo azul falla el ${name} (poco daño)`);
        return { winner: null, contested: false, freeItem: false, ancestral: false, bonus: null, log, duels, floats, kills };
      }
      winner = 'blue';
    } else if (redP.length > 0 && blueP.length === 0) {
      if (rp < objHp * 0.35) {
        pushLog(log, `El equipo rojo falla el ${name} (poco daño)`);
        return { winner: null, contested: false, freeItem: false, ancestral: false, bonus: null, log, duels, floats, kills };
      }
      winner = 'red';
    } else {
      if (blueP[0] && redP[0]) {
        resolveDuel(
          { champ: blueP[0], action: bluePlan.actions[blueP[0].instanceId] || 'attack', ult: bluePlan.ultimates.includes(blueP[0].instanceId), lane: 1 },
          { champ: redP[0], action: redPlan.actions[redP[0].instanceId] || 'attack', ult: redPlan.ultimates.includes(redP[0].instanceId), lane: 1 },
          state, log, duels, floats, 1, kills,
        );
      }
      if (blueP[1] && redP[1] && blueP[1].isAlive && redP[1].isAlive) {
        resolveDuel(
          { champ: blueP[1], action: bluePlan.actions[blueP[1].instanceId] || 'attack', ult: bluePlan.ultimates.includes(blueP[1].instanceId), lane: 1 },
          { champ: redP[1], action: redPlan.actions[redP[1].instanceId] || 'attack', ult: redPlan.ultimates.includes(redP[1].instanceId), lane: 1 },
          state, log, duels, floats, 1, kills,
        );
      }
      bp = power(blueP.filter(c => c.isAlive));
      rp = power(redP.filter(c => c.isAlive));
      winner =
        blueP.filter(c => c.isAlive).length === 0 && redP.filter(c => c.isAlive).length > 0 ? 'red' :
        redP.filter(c => c.isAlive).length === 0 && blueP.filter(c => c.isAlive).length > 0 ? 'blue' :
        bp === rp ? (Math.random() < 0.45 ? 'blue' : 'red') :
        bp > rp ? 'blue' : 'red';
    }
  }

  if (!winner) {
    return { winner: null, contested, freeItem: false, ancestral: false, bonus: null, log, duels, floats, kills };
  }
  const rewards = grantObjectiveRewards(state, winner, obj, log);
  return {
    winner,
    contested,
    freeItem: rewards.freeItem,
    ancestral: rewards.ancestral,
    bonus: rewards.bonus,
    log,
    duels,
    floats,
    kills,
  };
}

function resolveObjective(
  state: TurnMatchState,
  bluePlan: TeamPlan,
  redPlan: TeamPlan,
  log: CombatLogLine[],
  duels: DuelSummary[],
  floats: CombatFloat[],
): { winner: TeamColor | null; contested: boolean; freeItem: boolean; ancestral: boolean; bonus: ObjectiveBonusAnnounce | null; kills: RawKill[] } {
  const r = applyObjectiveWithQte(state, bluePlan, redPlan, null);
  log.push(...r.log);
  duels.push(...r.duels);
  floats.push(...r.floats);
  return {
    winner: r.winner,
    contested: r.contested,
    freeItem: r.freeItem,
    ancestral: r.ancestral,
    bonus: r.bonus,
    kills: r.kills,
  };
}

function finalizeRoundBookkeeping(
  next: TurnMatchState,
  log: CombatLogLine[],
  scoreBeforeB: number,
  scoreBeforeR: number,
  killsBeforeB: number,
  killsBeforeR: number,
  towerStats: { blue: number; red: number },
  duels: DuelSummary[],
  floats: CombatFloat[],
  objResult: {
    winner: TeamColor | null;
    contested: boolean;
    freeItem: boolean;
    ancestral: boolean;
    bonus?: ObjectiveBonusAnnounce | null;
  },
  pendingQte: boolean,
  killEvents: RawKill[] = [],
  consumeSkipTurns = true,
): TurnMatchState {
  if (!pendingQte) {
    onDeathSetRespawn(next);
    income(next);
    reviveDead(next, log);
  }

  let matchOver = false;
  let winner: TeamColor | null = null;
  let autoNexus = false;

  const nexusBlue = next.structures.find(s => s.id === 'nexus_blue');
  const nexusRed = next.structures.find(s => s.id === 'nexus_red');
  if (!pendingQte) {
    const redDead = !!nexusRed?.isDestroyed;
    const blueDead = !!nexusBlue?.isDestroyed;

    if (redDead && !blueDead) {
      matchOver = true;
      winner = 'blue';
      autoNexus = true;
      next.blue.score += POINTS_NEXUS;
    } else if (blueDead && !redDead) {
      matchOver = true;
      winner = 'red';
      autoNexus = true;
      next.red.score += POINTS_NEXUS;
    } else if (redDead && blueDead) {
      // Ambos nexos caen en la misma ronda: gana quien iba mejor en marcador (sin sumar nexo 2 veces)
      matchOver = true;
      autoNexus = true;
      winner = next.blue.kills > next.red.kills ? 'blue'
        : next.red.kills > next.blue.kills ? 'red'
        : next.blue.score >= next.red.score ? 'blue' : 'red';
      if (winner === 'blue') next.blue.score += POINTS_NEXUS;
      else next.red.score += POINTS_NEXUS;
      pushLog(log, `Ambos nexos caen · gana ${winner === 'blue' ? next.blue.name : next.red.name} por bajas`);
    }

    if (!matchOver && next.round >= next.maxRounds) {
      matchOver = true;
      winner = next.blue.kills > next.red.kills ? 'blue'
        : next.red.kills > next.blue.kills ? 'red'
        : next.blue.score >= next.red.score ? 'blue' : 'red';
      pushLog(log, `Fin de las ${next.maxRounds} rondas. Bajas ${next.blue.kills}–${next.red.kills}`);
    }
  }

  const resolution: RoundResolution = {
    round: next.round,
    log,
    duels,
    floats,
    blueScoreDelta: next.blue.score - scoreBeforeB,
    redScoreDelta: next.red.score - scoreBeforeR,
    blueKillsDelta: next.blue.kills - killsBeforeB,
    redKillsDelta: next.red.kills - killsBeforeR,
    towersTakenBlue: towerStats.blue,
    towersTakenRed: towerStats.red,
    objective: next.objective,
    objectiveWinner: objResult.winner,
    contestedObjective: objResult.contested,
    awardedFreeItem: objResult.freeItem,
    ancestralGranted: objResult.ancestral,
    pendingObjectiveQte: pendingQte,
    killAnnounces: aggregateKillAnnounces(killEvents),
    objectiveBonus: objResult.bonus ?? null,
    matchOver,
    winner,
    autoNexus,
  };

  next.lastResolution = resolution;
  next.pendingReward = objResult.winner === 'blue' && !matchOver && !pendingQte;
  if (pendingQte) {
    return next;
  }
  if (consumeSkipTurns) {
    for (const c of [...next.blue.champions, ...next.red.champions]) {
      if ((c.skipTurns || 0) > 0) {
        pushLog(log, `${champDef(c).name} pierde el turno (escapó de la pelea)`);
        c.skipTurns -= 1;
      }
    }
  }
  if (matchOver) {
    next.isComplete = true;
    next.winner = winner;
    next.pendingReward = false;
  } else {
    next.round += 1;
    next.objective = objectiveForRound(next.round);
  }
  next.pendingObjective = null;
  next.deferredBluePlan = null;
  next.deferredRedPlan = null;
  return next;
}

export function resolveRound(state: TurnMatchState, bluePlan: TeamPlan, redPlan: TeamPlan): TurnMatchState {
  const next = {
    ...state,
    blue: deepCloneTeam(state.blue),
    red: deepCloneTeam(state.red),
    structures: state.structures.map(s => ({ ...s })),
    pendingObjective: null as TurnMatchState['pendingObjective'],
    deferredBluePlan: null as TeamPlan | null,
    deferredRedPlan: null as TeamPlan | null,
  };
  const log: CombatLogLine[] = [];
  const duels: DuelSummary[] = [];
  const floats: CombatFloat[] = [];
  const killEvents: RawKill[] = [];
  const towerStats = { blue: 0, red: 0 };
  const siegeCtx: SiegeCtx = {
    bluePlan,
    redPlan,
    blueNexusThreat: null,
    redNexusThreat: null,
  };
  const scoreBeforeB = next.blue.score;
  const scoreBeforeR = next.red.score;
  const killsBeforeB = next.blue.kills;
  const killsBeforeR = next.red.kills;

  applyBurn([...next.blue.champions, ...next.red.champions], log);
  applyBootsLanes(next, bluePlan, redPlan);
  markUltimatesUsed(next, bluePlan, redPlan);

  // Jungla muerto/skip: no gankea ni va a objetivo, aunque el plan lo diga
  bluePlan = sanitizeJunglePlan(bluePlan, next.blue);
  redPlan = sanitizeJunglePlan(redPlan, next.red);
  siegeCtx.bluePlan = bluePlan;
  siegeCtx.redPlan = redPlan;

  pushLog(log, `— Ronda ${next.round} —`, 'section');

  if (!livingJungler(next.blue)) {
    pushLog(log, `${next.blue.name}: jungla fuera de combate · sin gank este turno`);
  }
  if (!livingJungler(next.red)) {
    pushLog(log, `${next.red.name}: jungla fuera de combate · sin gank este turno`);
  }

  for (const c of living(next.blue)) {
    const a = bluePlan.actions[c.instanceId];
    if (a) c.revealedAction = a;
  }
  for (const c of living(next.red)) {
    const a = redPlan.actions[c.instanceId];
    if (a) c.revealedAction = a;
  }

  // Solo cuenta gank si esa jungla está viva y eligió línea
  const blueGank = livingJungler(next.blue) && typeof bluePlan.jungleTarget === 'number'
    ? bluePlan.jungleTarget
    : null;
  const redGank = livingJungler(next.red) && typeof redPlan.jungleTarget === 'number'
    ? redPlan.jungleTarget
    : null;
  const contestedGankLane: LaneId | null =
    blueGank !== null && redGank !== null && blueGank === redGank ? blueGank : null;

  for (const lane of [0, 1, 2] as LaneId[]) {
    resolveLaneGroup(
      next, lane, bluePlan, redPlan, log, duels, floats, towerStats, killEvents,
      contestedGankLane === lane,
      siegeCtx,
    );
  }

  applyFreeLaneAdvantage(next, bluePlan, redPlan, log, floats, towerStats, siegeCtx);

  const nexusBlue = next.structures.find(s => s.id === 'nexus_blue');
  const nexusRed = next.structures.find(s => s.id === 'nexus_red');
  const nexusAlreadyDown = !!(nexusBlue?.isDestroyed || nexusRed?.isDestroyed);

  // Amenaza letal al nexo del jugador → QTE de defensa (prioridad máxima)
  if (siegeCtx.blueNexusThreat) {
    const threat = siegeCtx.blueNexusThreat;
    const lane = threat.lane;
    const defenders = living(next.blue)
      .slice()
      .sort((a, b) => {
        const la = a.position.lane === lane ? 0 : 1;
        const lb = b.position.lane === lane ? 0 : 1;
        if (la !== lb) return la - lb;
        return (b.stats.hp / b.stats.maxHp) - (a.stats.hp / a.stats.maxHp);
      })
      .slice(0, 2);
    const blueIds = defenders.map(c => c.instanceId);
    const redIds = [threat.siegerId];
    next.pendingObjective = {
      kind: 'nexus_defense',
      contested: true,
      blueIds,
      redIds,
      objective: null,
      lane,
    };
    next.deferredBluePlan = bluePlan;
    next.deferredRedPlan = redPlan;
    pushLog(log, `¡Asalto al Nexo en ${laneLabel(lane)}! Defiende con bolitas amarillas`, 'section');
    return finalizeRoundBookkeeping(
      next, log, scoreBeforeB, scoreBeforeR, killsBeforeB, killsBeforeR,
      towerStats, duels, floats,
      { winner: null, contested: true, freeItem: false, ancestral: false, bonus: null },
      true,
      killEvents,
    );
  }

  // Amenaza letal al nexo enemigo → QTE de asalto (contra el nexo)
  if (siegeCtx.redNexusThreat) {
    const threat = siegeCtx.redNexusThreat;
    const lane = threat.lane;
    const attackers = living(next.blue)
      .slice()
      .sort((a, b) => {
        const la = a.position.lane === lane ? 0 : 1;
        const lb = b.position.lane === lane ? 0 : 1;
        if (la !== lb) return la - lb;
        return (b.stats.hp / b.stats.maxHp) - (a.stats.hp / a.stats.maxHp);
      })
      .slice(0, 2);
    const blueIds = attackers.length > 0
      ? attackers.map(c => c.instanceId)
      : [threat.siegerId];
    next.pendingObjective = {
      kind: 'nexus_assault',
      contested: false,
      blueIds,
      redIds: [],
      objective: null,
      lane,
    };
    next.deferredBluePlan = bluePlan;
    next.deferredRedPlan = redPlan;
    pushLog(log, `¡Nexo enemigo vulnerable en ${laneLabel(lane)}! Derriba la base con bolitas amarillas`, 'section');
    return finalizeRoundBookkeeping(
      next, log, scoreBeforeB, scoreBeforeR, killsBeforeB, killsBeforeR,
      towerStats, duels, floats,
      { winner: null, contested: false, freeItem: false, ancestral: false, bonus: null },
      true,
      killEvents,
    );
  }

  // Choque de junglas en la misma línea → QTE (como dragón/barón)
  if (contestedGankLane !== null && !nexusAlreadyDown) {
    const blueJg = living(next.blue).find(c => champDef(c).role === 'jungle');
    const redJg = living(next.red).find(c => champDef(c).role === 'jungle');
    if (blueJg && redJg) {
      // Incluir laners vivos de esa línea en la pelea 2v2
      const blueLaners = living(next.blue).filter(c => {
        const def = champDef(c);
        if (def.role === 'jungle') return false;
        let laneNow = c.position.lane as number;
        if (bluePlan.bootsLane?.[c.instanceId] !== undefined && hasItem(c, 'boots')) {
          laneNow = bluePlan.bootsLane[c.instanceId];
        }
        return laneNow === contestedGankLane;
      });
      const redLaners = living(next.red).filter(c => {
        const def = champDef(c);
        if (def.role === 'jungle') return false;
        let laneNow = c.position.lane as number;
        if (redPlan.bootsLane?.[c.instanceId] !== undefined && hasItem(c, 'boots')) {
          laneNow = redPlan.bootsLane[c.instanceId];
        }
        return laneNow === contestedGankLane;
      });
      const blueIds = [blueJg.instanceId, ...blueLaners.slice(0, 1).map(c => c.instanceId)];
      const redIds = [redJg.instanceId, ...redLaners.slice(0, 1).map(c => c.instanceId)];
      next.pendingObjective = {
        kind: 'gank',
        contested: true,
        blueIds,
        redIds,
        objective: null,
        lane: contestedGankLane,
      };
      next.deferredBluePlan = bluePlan;
      next.deferredRedPlan = redPlan;
      pushLog(log, `¡Choque de junglas en ${laneLabel(contestedGankLane)}!`, 'section');
      return finalizeRoundBookkeeping(
        next, log, scoreBeforeB, scoreBeforeR, killsBeforeB, killsBeforeR,
        towerStats, duels, floats,
        { winner: null, contested: true, freeItem: false, ancestral: false, bonus: null },
        true,
        killEvents,
      );
    }
  }

  const blueWants = !!livingJungler(next.blue) && bluePlan.jungleTarget === 'objective' && !!next.objective;
  const redWants = !!livingJungler(next.red) && redPlan.jungleTarget === 'objective' && !!next.objective;

  // Si el jugador va al objetivo (solo o contested), diferir a QTE.
  // Si un nexo ya cayó, la partida terminó: no abrir QTE.
  if (blueWants) {
    if (nexusAlreadyDown) {
      return finalizeRoundBookkeeping(
        next, log, scoreBeforeB, scoreBeforeR, killsBeforeB, killsBeforeR,
        towerStats, duels, floats,
        { winner: null, contested: false, freeItem: false, ancestral: false, bonus: null },
        false,
        killEvents,
      );
    }
    const blueP = objectiveParticipants(next.blue, bluePlan);
    const redP = objectiveParticipants(next.red, redPlan);
    next.pendingObjective = {
      kind: 'objective',
      contested: redWants && redP.length > 0,
      blueIds: blueP.map(c => c.instanceId),
      redIds: redP.map(c => c.instanceId),
      objective: next.objective,
    };
    next.deferredBluePlan = bluePlan;
    next.deferredRedPlan = redPlan;
    return finalizeRoundBookkeeping(
      next, log, scoreBeforeB, scoreBeforeR, killsBeforeB, killsBeforeR,
      towerStats, duels, floats,
      { winner: null, contested: !!next.pendingObjective.contested, freeItem: false, ancestral: false, bonus: null },
      true,
      killEvents,
    );
  }

  const objResult = resolveObjective(next, bluePlan, redPlan, log, duels, floats);
  killEvents.push(...objResult.kills);
  return finalizeRoundBookkeeping(
    next, log, scoreBeforeB, scoreBeforeR, killsBeforeB, killsBeforeR,
    towerStats, duels, floats, objResult, false, killEvents,
  );
}

/** Aplica muerte forzada o escape del perdedor en escaramuza contested. */
function applySkirmishLoserFate(
  state: TurnMatchState,
  pending: NonNullable<TurnMatchState['pendingObjective']>,
  winner: TeamColor,
  fate: 'killed' | 'escaped',
  log: CombatLogLine[],
  floats: CombatFloat[],
  killEvents: RawKill[],
  lane: LaneId,
) {
  const loser: TeamColor = winner === 'blue' ? 'red' : 'blue';
  const wTeam = winner === 'blue' ? state.blue : state.red;
  const lTeam = loser === 'blue' ? state.blue : state.red;
  const loserIds = loser === 'blue' ? pending.blueIds : pending.redIds;
  const winnerIds = winner === 'blue' ? pending.blueIds : pending.redIds;

  const killer =
    livingIncludingSkipped(wTeam).find(c => winnerIds.includes(c.instanceId))
    || livingIncludingSkipped(wTeam).find(c => champDef(c).role === 'jungle')
    || livingIncludingSkipped(wTeam)[0];

  for (const id of loserIds) {
    const victim = lTeam.champions.find(c => c.instanceId === id);
    if (!victim || !victim.isAlive || victim.stats.hp <= 0) continue;

    if (fate === 'escaped') {
      victim.skipTurns = Math.max(victim.skipTurns || 0, 1);
      pushLog(
        log,
        `${champDef(victim).name} escapa justo a tiempo · pierde el próximo turno`,
        'neutral',
      );
      continue;
    }

    const overkill = Math.max(victim.stats.hp, 1);
    victim.stats.hp = 0;
    victim.isAlive = false;
    wTeam.kills += 1;
    wTeam.score += POINTS_KILL;
    if (killer) {
      killer.kills = (killer.kills || 0) + 1;
      killer.gold += GOLD_PER_KILL;
      pushKill(killEvents, killer, victim);
    }
    pushFloat(floats, {
      kind: 'damage',
      amount: overkill,
      targetType: 'champ',
      targetId: victim.instanceId,
      sourceName: killer ? champDef(killer).name : wTeam.name,
      sourceId: killer?.instanceId,
      sourceTeam: winner,
      targetName: champDef(victim).name,
      targetTeam: victim.team,
      lane,
    });
    pushLog(
      log,
      `¡${killer ? champDef(killer).name : wTeam.name} elimina a ${champDef(victim).name} en la escaramuza!`,
      'kill',
    );
  }
}

/** Completa una ronda con pendingObjective tras el QTE. */
export function finishPendingObjective(
  state: TurnMatchState,
  qte: {
    skirmishWinner: TeamColor | null;
    attackingTeam: TeamColor;
    monsterTaken: boolean;
    loserFate?: 'killed' | 'escaped';
  },
): TurnMatchState {
  if (!state.pendingObjective) return state;
  // Sin planes diferidos: finalizar ronda igual para no dejar el partido a medias
  if (!state.deferredBluePlan || !state.deferredRedPlan) {
    const next = {
      ...state,
      blue: deepCloneTeam(state.blue),
      red: deepCloneTeam(state.red),
      structures: state.structures.map(s => ({ ...s })),
      pendingObjective: null,
      deferredBluePlan: null,
      deferredRedPlan: null,
    };
    const prev = state.lastResolution;
    return finalizeRoundBookkeeping(
      next,
      [...(prev?.log || [])],
      next.blue.score - (prev?.blueScoreDelta || 0),
      next.red.score - (prev?.redScoreDelta || 0),
      next.blue.kills - (prev?.blueKillsDelta || 0),
      next.red.kills - (prev?.redKillsDelta || 0),
      { blue: prev?.towersTakenBlue || 0, red: prev?.towersTakenRed || 0 },
      [...(prev?.duels || [])],
      [...(prev?.floats || [])],
      { winner: null, contested: false, freeItem: false, ancestral: false, bonus: null },
      false,
      [],
      false,
    );
  }
  const next = {
    ...state,
    blue: deepCloneTeam(state.blue),
    red: deepCloneTeam(state.red),
    structures: state.structures.map(s => ({ ...s })),
  };
  const prev = state.lastResolution;
  const log: CombatLogLine[] = [...(prev?.log || [])];
  const duels: DuelSummary[] = [...(prev?.duels || [])];
  const floats: CombatFloat[] = [...(prev?.floats || [])];
  const killEvents: RawKill[] = [];
  const scoreBeforeB = next.blue.score - (prev?.blueScoreDelta || 0);
  const scoreBeforeR = next.red.score - (prev?.redScoreDelta || 0);
  const killsBeforeB = next.blue.kills - (prev?.blueKillsDelta || 0);
  const killsBeforeR = next.red.kills - (prev?.redKillsDelta || 0);
  const towerStats = {
    blue: prev?.towersTakenBlue || 0,
    red: prev?.towersTakenRed || 0,
  };

  const pending = state.pendingObjective;
  const fate: 'killed' | 'escaped' = qte.loserFate || 'killed';

  if (pending.kind === 'nexus_defense') {
    const lane = (pending.lane ?? 1) as LaneId;
    const winner = qte.skirmishWinner || qte.attackingTeam;
    const nexus = next.structures.find(s => s.id === 'nexus_blue');

    if (winner === 'blue') {
      const restored = Math.floor(NEXUS_MAX_HP * 0.25);
      if (nexus) {
        nexus.hp = restored;
        nexus.isDestroyed = false;
      }
      next.blue.nexusHp = restored;
      pushLog(
        log,
        fate === 'escaped'
          ? `¡Nexo defendido en ${laneLabel(lane)}! El asaltante huye · base al ${Math.round((restored / NEXUS_MAX_HP) * 100)}%`
          : `¡Nexo defendido en ${laneLabel(lane)}! Base restaurada al ${Math.round((restored / NEXUS_MAX_HP) * 100)}%`,
        'tower',
      );
    } else {
      if (nexus) {
        nexus.hp = 0;
        nexus.isDestroyed = true;
      }
      next.blue.nexusHp = 0;
      pushLog(log, `¡NEXO DESTRUIDO! Fallaste la defensa en ${laneLabel(lane)}`, 'tower');
    }

    next.pendingObjective = null;
    next.deferredBluePlan = null;
    next.deferredRedPlan = null;

    return finalizeRoundBookkeeping(
      next, log, scoreBeforeB, scoreBeforeR, killsBeforeB, killsBeforeR,
      towerStats, duels, floats,
      { winner: null, contested: true, freeItem: false, ancestral: false, bonus: null },
      false,
      killEvents,
      false,
    );
  }

  if (pending.kind === 'gank') {
    const lane = (pending.lane ?? 1) as LaneId;
    const winner = qte.skirmishWinner || qte.attackingTeam;
    const wTeam = winner === 'blue' ? next.blue : next.red;

    pushLog(log, `Choque de junglas en ${laneLabel(lane)} · gana ${wTeam.name}`, 'kill');
    if (fate === 'escaped') {
      pushLog(
        log,
        winner === 'blue' ? 'El enemigo escapó' : 'Tu equipo escapa de la pelea',
        'neutral',
      );
    }
    applySkirmishLoserFate(next, pending, winner, fate, log, floats, killEvents, lane);

    const wJg = livingIncludingSkipped(wTeam).find(c => champDef(c).role === 'jungle')
      || next[winner].champions.find(c => pending.blueIds.includes(c.instanceId) || pending.redIds.includes(c.instanceId));

    // El ganador asedia la torre enemiga una vez (recompensa del gank)
    if (wJg && wJg.isAlive && wJg.stats.hp > 0) {
      const towerTeam: TeamColor = winner === 'blue' ? 'red' : 'blue';
      siegeTower(next, towerTeam, lane, wJg, log, duels, floats, towerStats);
    }

    next.pendingObjective = null;
    next.deferredBluePlan = null;
    next.deferredRedPlan = null;

    return finalizeRoundBookkeeping(
      next, log, scoreBeforeB, scoreBeforeR, killsBeforeB, killsBeforeR,
      towerStats, duels, floats,
      { winner: null, contested: true, freeItem: false, ancestral: false, bonus: null },
      false,
      killEvents,
      false,
    );
  }

  // Objetivo contested: aplicar destino del perdedor de la escaramuza
  if (pending.contested && qte.skirmishWinner) {
    if (fate === 'escaped') {
      pushLog(
        log,
        qte.skirmishWinner === 'blue' ? 'El enemigo escapó' : 'Tu equipo escapa de la pelea',
        'neutral',
      );
    }
    applySkirmishLoserFate(
      next, pending, qte.skirmishWinner, fate, log, floats, killEvents, 1,
    );
  }

  const r = applyObjectiveWithQte(next, state.deferredBluePlan, state.deferredRedPlan, qte);
  log.push(...r.log);
  duels.push(...r.duels);
  floats.push(...r.floats);
  killEvents.push(...r.kills);

  next.pendingObjective = null;
  next.deferredBluePlan = null;
  next.deferredRedPlan = null;

  return finalizeRoundBookkeeping(
    next, log, scoreBeforeB, scoreBeforeR, killsBeforeB, killsBeforeR,
    towerStats, duels, floats,
    { winner: r.winner, contested: r.contested, freeItem: r.freeItem, ancestral: r.ancestral, bonus: r.bonus },
    false,
    killEvents,
    false,
  );
}

function grantFreeItemToTeam(team: TeamData, log: CombatLogLine[]) {
  const alive = living(team).filter(c => c.items.length < 6);
  if (alive.length === 0) return;
  // Prefer jungler, else lowest item count
  alive.sort((a, b) => {
    const ja = champDef(a).role === 'jungle' ? 0 : 1;
    const jb = champDef(b).role === 'jungle' ? 0 : 1;
    if (ja !== jb) return ja - jb;
    return a.items.length - b.items.length;
  });
  const champ = alive[0];
  const def = champDef(champ);
  const prio = ITEM_PRIORITY_BY_ROLE[def.role];
  for (const id of prio) {
    if (champ.items.some(i => i.defId === id)) continue;
    if (grantFreeItem(champ, id)) {
      pushLog(log, `${def.name} recibe ítem gratis: ${ITEMS.find(i => i.id === id)?.name}`, 'objective');
      return;
    }
  }
}

export function grantFreeItem(champ: Champion, itemId: string): boolean {
  const item = ITEMS.find(i => i.id === itemId);
  if (!item || champ.items.length >= 6) return false;
  champ.items.push({ defId: itemId });
  if (item.statBonus.maxHp) {
    champ.stats.maxHp += item.statBonus.maxHp;
    champ.stats.hp += item.statBonus.maxHp;
  }
  if (item.statBonus.maxMana) {
    champ.stats.maxMana += (item.statBonus.maxMana || 0);
    champ.stats.mana += (item.statBonus.maxMana || 0);
  }
  if (item.statBonus.ad) champ.stats.ad += item.statBonus.ad;
  if (item.statBonus.ap) champ.stats.ap += item.statBonus.ap;
  if (item.statBonus.attackSpeed) champ.stats.attackSpeed += item.statBonus.attackSpeed;
  if (item.statBonus.armor) champ.stats.armor += item.statBonus.armor;
  if (item.statBonus.mr) champ.stats.mr += item.statBonus.mr;
  if (item.statBonus.moveSpeed) champ.stats.moveSpeed += item.statBonus.moveSpeed;
  return true;
}

/** Enemy gets free siege when ally left their home lane for objective. */
function applyFreeLaneAdvantage(
  state: TurnMatchState,
  bluePlan: TeamPlan,
  redPlan: TeamPlan,
  log: CombatLogLine[],
  floats: CombatFloat[],
  towerStats: { blue: number; red: number },
  siegeCtx?: SiegeCtx,
) {
  const check = (plan: TeamPlan, allyTeam: TeamColor) => {
    if (plan.jungleTarget !== 'objective' || !plan.objectiveAssistId) return;
    const ally = (allyTeam === 'blue' ? state.blue : state.red).champions.find(c => c.instanceId === plan.objectiveAssistId);
    if (!ally) return;
    const homeLane = roleLane(champDef(ally).role) as LaneId;
    // Enemy unopposed in that lane → instant siege push
    const enemyTeam = allyTeam === 'blue' ? 'red' : 'blue';
    const enemies = fightersInLane(state, homeLane, bluePlan, redPlan)[enemyTeam === 'blue' ? 'blue' : 'red'];
    const alliesLeft = fightersInLane(state, homeLane, bluePlan, redPlan)[allyTeam === 'blue' ? 'blue' : 'red'];
    if (enemies.length > 0 && alliesLeft.length === 0) {
      const sieger = enemies[0].champ;
      pushLog(log, `${champDef(sieger).name} aprovecha la línea libre (${laneLabel(homeLane)})`, 'tower');
      for (let i = 0; i < FREE_LANE_SIEGE_BONUS; i++) {
        siegeTower(state, allyTeam, homeLane, sieger, log, [], floats, towerStats, siegeCtx);
      }
    }
  };
  check(bluePlan, 'blue');
  check(redPlan, 'red');
}

function markUltimatesUsed(state: TurnMatchState, bluePlan: TeamPlan, redPlan: TeamPlan) {
  for (const id of bluePlan.ultimates) {
    const c = state.blue.champions.find(x => x.instanceId === id);
    if (c) c.ultimateUsed = true;
  }
  for (const id of redPlan.ultimates) {
    const c = state.red.champions.find(x => x.instanceId === id);
    if (c) c.ultimateUsed = true;
  }
}

function applyBootsLanes(state: TurnMatchState, bluePlan: TeamPlan, redPlan: TeamPlan) {
  const apply = (team: TeamData, plan: TeamPlan) => {
    for (const c of team.champions) {
      const lane = plan.bootsLane?.[c.instanceId];
      if (lane !== undefined && hasItem(c, 'boots')) {
        c.position.lane = lane;
      }
    }
  };
  apply(state.blue, bluePlan);
  apply(state.red, redPlan);
}

function income(state: TurnMatchState) {
  for (const c of [...state.blue.champions, ...state.red.champions]) {
    if (c.isAlive) c.gold += GOLD_PER_ROUND;
  }
}

function reviveDead(state: TurnMatchState, log: CombatLogLine[]) {
  for (const c of [...state.blue.champions, ...state.red.champions]) {
    if (c.isAlive) continue;
    c.respawnTimer -= 1;
    if (c.respawnTimer <= 0) {
      c.isAlive = true;
      c.stats.hp = Math.floor(c.stats.maxHp * 0.7);
      c.respawnTimer = 0;
      c.siegeStacks = 0;
      const def = champDef(c);
      c.position.lane = roleLane(def.role);
      pushLog(log, `${def.name} revive con 70% de vida`);
    }
  }
}

function onDeathSetRespawn(state: TurnMatchState) {
  for (const c of [...state.blue.champions, ...state.red.champions]) {
    if (!c.isAlive && c.stats.hp <= 0 && c.respawnTimer <= 0) {
      // 2 → 1 al cerrar la ronda: falta el próximo turno completo antes de revivir
      c.respawnTimer = 2;
    }
  }
}

/** Plan IA agresivo. Opcionalmente reacciona al plan del rival (counter-gank). */
export function generateAIPlan(
  state: TurnMatchState,
  team: 'blue' | 'red',
  enemyPlan?: TeamPlan | null,
): TeamPlan {
  const t = team === 'blue' ? state.blue : state.red;
  const enemy = team === 'blue' ? state.red : state.blue;
  const actions: Record<string, CombatAction> = {};
  const ultimates: string[] = [];
  const bootsLane: Record<string, LaneId> = {};
  let jungleTarget: TeamPlan['jungleTarget'] = undefined;
  let objectiveAssistId: string | undefined;

  // Torre propia más dañada → priorizar defensa
  const ownTowers = state.structures.filter(s => s.type === 'tower' && s.team === team && !s.isDestroyed);
  const weakTower = [...ownTowers].sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
  const defendLane: LaneId | null =
    weakTower && weakTower.hp / weakTower.maxHp < 0.55 ? (weakTower.lane as LaneId) : null;

  const jg = livingJungler(t);

  for (const c of living(t)) {
    const def = champDef(c);
    const hpPct = c.stats.hp / c.stats.maxHp;
    let action: CombatAction = 'attack';
    // IA más agresiva: solo defiende muy baja de vida
    if (hpPct < 0.32) action = 'defend';
    else if (defendLane !== null && c.position.lane === defendLane && hpPct < 0.55) action = 'defend';
    else if (def.baseStats.ap >= def.baseStats.ad) action = Math.random() < 0.6 ? 'ability' : 'attack';
    else action = Math.random() < 0.72 ? 'attack' : (Math.random() < 0.55 ? 'ability' : 'defend');
    actions[c.instanceId] = action;

    if (!c.ultimateUsed && Math.random() < 0.58) {
      ultimates.push(c.instanceId);
    }

    if (hasItem(c, 'boots') && Math.random() < 0.55) {
      bootsLane[c.instanceId] = defendLane ?? ([0, 1, 2] as LaneId[])[Math.floor(Math.random() * 3)];
    }
  }

  // Solo planifica gank/objetivo si la jungla puede actuar
  if (jg) {
    const enemyJt = enemyPlan?.jungleTarget;
    const enemyCanContest = !!livingJungler(enemy) && enemyJt !== undefined;
    // Counter: si el rival gankea una línea, a menudo contestamos
    if (enemyCanContest && typeof enemyJt === 'number' && Math.random() < 0.8) {
      jungleTarget = enemyJt;
    } else if (enemyCanContest && enemyJt === 'objective' && state.objective && Math.random() < 0.78) {
      jungleTarget = 'objective';
      const candidates = living(t).filter(x => champDef(x).role !== 'jungle');
      if (candidates.length) {
        objectiveAssistId = candidates[Math.floor(Math.random() * candidates.length)].instanceId;
      }
    } else if (defendLane !== null && Math.random() < 0.45) {
      jungleTarget = defendLane;
    } else if (state.objective && Math.random() < 0.62) {
      jungleTarget = 'objective';
      const candidates = living(t).filter(x => champDef(x).role !== 'jungle');
      if (candidates.length) {
        objectiveAssistId = candidates[Math.floor(Math.random() * candidates.length)].instanceId;
      }
    } else {
      const weak = living(enemy).sort((a, b) => a.stats.hp - b.stats.hp)[0];
      jungleTarget = weak ? (weak.position.lane as LaneId) : 1;
    }
  }

  return { actions, ultimates, bootsLane, jungleTarget, objectiveAssistId };
}

export function buyItem(champ: Champion, itemId: string): boolean {
  const item = ITEMS.find(i => i.id === itemId);
  if (!item || champ.items.length >= 6) return false;
  const cost = item.cost;
  if (champ.gold < cost) return false;
  champ.gold -= cost;
  champ.items.push({ defId: itemId });
  if (item.statBonus.maxHp) {
    champ.stats.maxHp += item.statBonus.maxHp;
    champ.stats.hp += item.statBonus.maxHp;
  }
  if (item.statBonus.maxMana) {
    champ.stats.maxMana += (item.statBonus.maxMana || 0);
    champ.stats.mana += (item.statBonus.maxMana || 0);
  }
  if (item.statBonus.ad) champ.stats.ad += item.statBonus.ad;
  if (item.statBonus.ap) champ.stats.ap += item.statBonus.ap;
  if (item.statBonus.attackSpeed) champ.stats.attackSpeed += item.statBonus.attackSpeed;
  if (item.statBonus.armor) champ.stats.armor += item.statBonus.armor;
  if (item.statBonus.mr) champ.stats.mr += item.statBonus.mr;
  if (item.statBonus.moveSpeed) champ.stats.moveSpeed += item.statBonus.moveSpeed;
  return true;
}

export function aiBuyItems(team: TeamData) {
  for (const c of living(team)) {
    if (c.items.length >= 6) continue;
    const def = champDef(c);
    const prio = ITEM_PRIORITY_BY_ROLE[def.role];
    for (const id of prio) {
      if (c.items.some(i => i.defId === id)) continue;
      const item = ITEMS.find(i => i.id === id);
      if (!item || c.gold < item.cost) continue;
      if (buyItem(c, id)) break;
    }
  }
}

/** Simula una partida IA completa (bracket). */
/** Simula una partida completa (ambos equipos juegan con IA). Sin input del jugador. */
export function simulateAITurnMatch(teamA: TeamData, teamB: TeamData): TurnMatchState {
  let state = createTurnMatch(
    createTurnTeam(teamA.id, teamA.name, 'blue', teamA.champions.map(c => c.defId)),
    createTurnTeam(teamB.id, teamB.name, 'red', teamB.champions.map(c => c.defId)),
  );

  while (!state.isComplete) {
    const bluePlan = generateAIPlan(state, 'blue');
    const redPlan = generateAIPlan(state, 'red', bluePlan);
    state = resolveRound(state, bluePlan, redPlan);
    if (state.pendingObjective) {
      const kind = state.pendingObjective.kind;
      const isNexusAssault = kind === 'nexus_assault';
      const isSkirmishOnly = kind === 'gank' || kind === 'nexus_defense';
      const attacking: 'blue' | 'red' = isNexusAssault
        ? 'blue'
        : isSkirmishOnly
          ? (Math.random() < 0.5 ? 'blue' : 'red')
          : bluePlan.jungleTarget === 'objective' ? 'blue' :
            redPlan.jungleTarget === 'objective' ? 'red' : 'blue';
      const skirmishWinner = state.pendingObjective.contested
        ? (Math.random() < 0.5 ? 'blue' : 'red')
        : (isSkirmishOnly ? attacking : null);
      state = finishPendingObjective(state, {
        skirmishWinner,
        attackingTeam: skirmishWinner || attacking,
        monsterTaken: isNexusAssault
          ? Math.random() < 0.65
          : isSkirmishOnly ? true : Math.random() < 0.7,
      });
    }
    state = { ...state, pendingReward: false };
    if (!state.isComplete) {
      aiBuyItems(state.blue);
      aiBuyItems(state.red);
    }
  }

  return state;
}

export function getAhriReveal(_state: TurnMatchState, enemyMidAction: CombatAction | null): CombatAction | null {
  return enemyMidAction;
}
