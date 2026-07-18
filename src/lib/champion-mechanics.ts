import type {
  Champion,
  CombatAction,
  CombatFloat,
  CombatLogLine,
  LaneId,
  TeamColor,
  TeamData,
  TeamPlan,
  TurnMatchState,
} from '@/types/game';
import { CHAMPIONS } from '@/lib/game-data';

export const MANA_COST = {
  attack: 20,
  ability: 40,
  defend: 0,
} as const;

/** Coste total fijo de maná al activar la definitiva (Atacar/Habilidad/Defender + R). */
export const ULT_TOTAL_MANA = 50;
export const ULT_COOLDOWN_TURNS = 3;

type FighterLike = { champ: Champion; action: CombatAction; ult: boolean; lane: number };

function defOf(c: Champion) {
  return CHAMPIONS.find(d => d.id === c.defId)!;
}

function passiveId(c: Champion) {
  return defOf(c).passive.id;
}

function roleLane(role: string): LaneId {
  if (role === 'top') return 0;
  if (role === 'adc' || role === 'support') return 2;
  return 1;
}

function nexusHomeX(team: TeamColor): number {
  return team === 'blue' ? 0.08 : 0.92;
}

export function manaCostFor(action: CombatAction, withUlt: boolean): number {
  if (withUlt) return ULT_TOTAL_MANA;
  if (action === 'attack') return MANA_COST.attack;
  if (action === 'ability') return MANA_COST.ability;
  return MANA_COST.defend;
}

function pushLog(log: CombatLogLine[], text: string, tone: CombatLogLine['tone'] = 'neutral') {
  log.push({ id: `m${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, text, tone });
}

function pushHeal(
  floats: CombatFloat[],
  amount: number,
  source: Champion,
  target: Champion,
  lane?: LaneId,
) {
  if (amount <= 0) return;
  floats.push({
    id: `fh${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind: 'heal',
    amount,
    targetType: 'champ',
    targetId: target.instanceId,
    sourceName: defOf(source).name,
    sourceId: source.instanceId,
    sourceTeam: source.team,
    targetName: defOf(target).name,
    targetTeam: target.team,
    lane,
  });
}

function mostWounded(team: TeamData, excludeId?: string): Champion | null {
  const list = team.champions.filter(
    c => c.isAlive && c.stats.hp > 0 && c.instanceId !== excludeId && (c.skipTurns || 0) <= 0,
  );
  if (!list.length) return null;
  return [...list].sort((a, b) => (a.stats.hp / a.stats.maxHp) - (b.stats.hp / b.stats.maxHp))[0];
}

function allyAdc(team: TeamData): Champion | null {
  return team.champions.find(c => c.isAlive && c.stats.hp > 0 && defOf(c).role === 'adc' && (c.skipTurns || 0) <= 0) || null;
}

/** Ajusta plan, gasta maná y fuerza recall si no puede atacar. */
export function prepareRoundResources(
  state: TurnMatchState,
  plan: TeamPlan,
  teamColor: TeamColor,
  log: CombatLogLine[],
): TeamPlan {
  const team = teamColor === 'blue' ? state.blue : state.red;
  const actions = { ...plan.actions };
  const ultimates = [...plan.ultimates];
  const bootsLane = { ...(plan.bootsLane || {}) };
  let jungleTarget = plan.jungleTarget;
  let objectiveAssistId = plan.objectiveAssistId;

  for (const c of team.champions) {
    c.recallingForMana = false;
    if (!c.isAlive || c.stats.hp <= 0 || (c.skipTurns || 0) > 0) {
      delete actions[c.instanceId];
      const idx = ultimates.indexOf(c.instanceId);
      if (idx >= 0) ultimates.splice(idx, 1);
      continue;
    }

    let action = actions[c.instanceId] || 'attack';
    let wantUlt = ultimates.includes(c.instanceId) && (c.ultimateCooldown || 0) <= 0;

    // Downgrade ability → attack si no alcanza
    if (action === 'ability' && c.stats.mana < manaCostFor('ability', false)) {
      action = 'attack';
      pushLog(log, `${defOf(c).name} no tiene maná para Habilidad · usa Atacar`);
    }

    // Ulti solo si hay maná extra y CD listo
    if (wantUlt) {
      const costWithUlt = manaCostFor(action, true);
      if (c.stats.mana < costWithUlt || (c.ultimateCooldown || 0) > 0) {
        wantUlt = false;
        const i = ultimates.indexOf(c.instanceId);
        if (i >= 0) ultimates.splice(i, 1);
      }
    } else {
      const i = ultimates.indexOf(c.instanceId);
      if (i >= 0) ultimates.splice(i, 1);
    }

    const cost = manaCostFor(action, wantUlt);

    // Sin maná para atacar → base (pierde este turno; se recarga al cerrar la ronda)
    if (c.stats.mana < MANA_COST.attack) {
      c.recallingForMana = true;
      c.position.lane = roleLane(defOf(c).role);
      c.position.x = nexusHomeX(c.team);
      delete actions[c.instanceId];
      const i = ultimates.indexOf(c.instanceId);
      if (i >= 0) ultimates.splice(i, 1);
      pushLog(log, `${defOf(c).name} se quedó sin maná · vuelve a base y pierde el turno`, 'neutral');
      continue;
    }

    // Si eligió atacar/habilidad pero no alcanza tras downgrade
    if (action !== 'defend' && c.stats.mana < cost) {
      if (c.stats.mana >= MANA_COST.attack) {
        action = 'attack';
        wantUlt = false;
        const i = ultimates.indexOf(c.instanceId);
        if (i >= 0) ultimates.splice(i, 1);
        const cost2 = manaCostFor(action, false);
        c.stats.mana = Math.max(0, c.stats.mana - cost2);
        actions[c.instanceId] = action;
      } else {
        c.recallingForMana = true;
        c.position.lane = roleLane(defOf(c).role);
        c.position.x = nexusHomeX(c.team);
        delete actions[c.instanceId];
        pushLog(log, `${defOf(c).name} se quedó sin maná · vuelve a base y pierde el turno`, 'neutral');
      }
      continue;
    }

    c.stats.mana = Math.max(0, c.stats.mana - cost);
    actions[c.instanceId] = action;
    if (wantUlt && !ultimates.includes(c.instanceId)) ultimates.push(c.instanceId);
    if (!wantUlt) {
      const i = ultimates.indexOf(c.instanceId);
      if (i >= 0) ultimates.splice(i, 1);
    }
  }

  // Jungla en base: anular gank
  const jg = team.champions.find(c => defOf(c).role === 'jungle');
  if (!jg || jg.recallingForMana || (jg.skipTurns || 0) > 0 || !jg.isAlive) {
    jungleTarget = undefined;
    objectiveAssistId = undefined;
  }
  if (objectiveAssistId && !actions[objectiveAssistId]) {
    objectiveAssistId = undefined;
  }

  return { actions, ultimates, bootsLane, jungleTarget, objectiveAssistId };
}

export function applyUltimateCooldowns(state: TurnMatchState, bluePlan: TeamPlan, redPlan: TeamPlan) {
  for (const id of bluePlan.ultimates) {
    const c = state.blue.champions.find(x => x.instanceId === id);
    if (c) c.ultimateCooldown = ULT_COOLDOWN_TURNS;
  }
  for (const id of redPlan.ultimates) {
    const c = state.red.champions.find(x => x.instanceId === id);
    if (c) c.ultimateCooldown = ULT_COOLDOWN_TURNS;
  }
}

/** Al cerrar ronda: refill recall + tick CD + regen ligera. */
export function finalizeResourceTicks(state: TurnMatchState, log: CombatLogLine[]) {
  for (const c of [...state.blue.champions, ...state.red.champions]) {
    if (c.recallingForMana) {
      c.stats.mana = c.stats.maxMana;
      c.recallingForMana = false;
      pushLog(log, `${defOf(c).name} recupera todo el maná en base`);
      // Vuelve a su línea casa para la siguiente
      c.position.lane = roleLane(defOf(c).role);
      c.position.x = c.team === 'blue' ? 0.2 : 0.8;
    } else if (c.isAlive && c.stats.hp > 0 && (c.skipTurns || 0) <= 0) {
      c.stats.mana = Math.min(c.stats.maxMana, c.stats.mana + 18);
    }

    if ((c.ultimateCooldown || 0) > 0) {
      c.ultimateCooldown -= 1;
    }
  }
}

export function applyRoundStartPassives(
  state: TurnMatchState,
  floats: CombatFloat[],
  log: CombatLogLine[],
) {
  for (const team of [state.blue, state.red]) {
    for (const c of team.champions) {
      if (!c.isAlive || c.stats.hp <= 0 || (c.skipTurns || 0) > 0) continue;
      const pid = passiveId(c);

      if (pid === 'granite_shield') {
        const shield = Math.floor(c.stats.maxHp * 0.08);
        c.stats.hp = Math.min(c.stats.maxHp, c.stats.hp + shield);
        pushHeal(floats, shield, c, c);
        pushLog(log, `${defOf(c).name} genera Escudo de granito (+${shield})`, 'ulti');
      }

      if (pid === 'ki_barrier') {
        const ally = mostWounded(team, c.instanceId);
        if (ally) {
          const before = ally.stats.hp;
          ally.stats.hp = Math.min(ally.stats.maxHp, ally.stats.hp + 25);
          const healed = ally.stats.hp - before;
          pushHeal(floats, healed, c, ally);
          if (healed > 0) pushLog(log, `Barrera de ki de ${defOf(c).name} cura a ${defOf(ally).name}`, 'ulti');
        }
      }

      if (pid === 'pix_friend') {
        const ally = mostWounded(team, c.instanceId);
        if (ally) {
          const amount = Math.floor(25 + c.stats.ap * 0.19);
          const before = ally.stats.hp;
          ally.stats.hp = Math.min(ally.stats.maxHp, ally.stats.hp + amount);
          const healed = ally.stats.hp - before;
          pushHeal(floats, healed, c, ally);
        }
      }

      if (pid === 'salvation') {
        const ally = mostWounded(team, c.instanceId);
        if (ally) {
          const amount = Math.floor(45 + c.stats.ap * 0.25);
          const before = ally.stats.hp;
          ally.stats.hp = Math.min(ally.stats.maxHp, ally.stats.hp + amount);
          const healed = ally.stats.hp - before;
          pushHeal(floats, healed, c, ally);
          if (healed > 0) pushLog(log, `${defOf(c).name} usa Salvación sobre ${defOf(ally).name}`, 'ulti');
        }
      }

      if (pid === 'you_and_me') {
        // se aplica al Defender en lane ults / duel prep via flag en passiveCounter bit
      }
    }
  }
}

/** Ultis de apoyo al inicio de línea (antes de duelos). */
export function applyLaneSupportUltimates(
  fighters: FighterLike[],
  team: TeamData,
  plan: TeamPlan,
  floats: CombatFloat[],
  log: CombatLogLine[],
  lane: LaneId,
) {
  for (const f of fighters) {
    if (!f.ult) continue;
    const id = f.champ.defId;

    if (id === 'soraka') {
      for (const a of team.champions.filter(x => x.isAlive && x.stats.hp > 0)) {
        const before = a.stats.hp;
        a.stats.hp = Math.min(a.stats.maxHp, a.stats.hp + 100);
        pushHeal(floats, a.stats.hp - before, f.champ, a, lane);
      }
      const wounded = mostWounded(team);
      if (wounded) {
        const before = wounded.stats.hp;
        wounded.stats.hp = Math.min(wounded.stats.maxHp, wounded.stats.hp + 50);
        pushHeal(floats, wounded.stats.hp - before, f.champ, wounded, lane);
      }
      pushLog(log, `${defOf(f.champ).name} lanza Deseo`, 'ulti');
    }

    if (id === 'lulu' || id === 'shen') {
      const ally = mostWounded(team, f.champ.instanceId);
      if (ally) {
        const heal = id === 'lulu' ? 125 : 50;
        const before = ally.stats.hp;
        ally.stats.hp = Math.min(ally.stats.maxHp, ally.stats.hp + heal);
        pushHeal(floats, ally.stats.hp - before, f.champ, ally, lane);
        plan.actions[ally.instanceId] = 'defend';
        pushLog(log, `${defOf(f.champ).name} protege a ${defOf(ally).name}`, 'ulti');
      }
    }

    if (id === 'yuumi') {
      const adc = allyAdc(team);
      if (adc) {
        const before = adc.stats.hp;
        adc.stats.hp = Math.min(adc.stats.maxHp, adc.stats.hp + 100);
        pushHeal(floats, adc.stats.hp - before, f.champ, adc, lane);
        adc.stats.ad += 25;
        pushLog(log, `${defOf(f.champ).name} potencia a ${defOf(adc).name}`, 'ulti');
      }
    }

    if (id === 'leona') {
      const adc = allyAdc(team);
      if (adc) adc.passiveCounter = (adc.passiveCounter || 0) + 1000; // flag +20 dmg this round via counter high bit
    }
  }
}

export function modifyPriority(c: Champion, _action: CombatAction, usedUlt: boolean, _foe?: Champion): number {
  let p = 0;
  const pid = passiveId(c);
  if (pid === 'get_excited') p += c.kills * 12;
  if (pid === 'flurry' && (c.passiveCounter || 0) > 0) p += 40;
  if (usedUlt && (c.defId === 'kayn' || c.defId === 'malphite' || c.defId === 'lee_sin' || c.defId === 'yasuo')) {
    p += 200;
  }
  return p;
}

export function foePriorityPenalty(defender: Champion, attacker: Champion, exchange: number): number {
  if (exchange === 0 && passiveId(defender) === 'staggering_blow' && attacker) return 30;
  if (passiveId(attacker) === 'frost_shot') return 0; // applied to defender
  return 0;
}

export function applyPreDuelEffects(a: FighterLike, b: FighterLike, log: CombatLogLine[]) {
  const applyOne = (self: FighterLike, foe: FighterLike) => {
    if (!self.ult) return;
    const id = self.champ.defId;
    if (id === 'amumu' && foe.action === 'defend') {
      foe.action = 'attack';
      pushLog(log, `${defOf(self.champ).name} impide Defender`, 'ulti');
    }
    if (id === 'leona' && foe.action === 'attack') {
      foe.action = 'defend';
      pushLog(log, `${defOf(self.champ).name} fuerza Defender con Llamarada solar`, 'ulti');
    }
    if (id === 'nautilus') {
      if (foe.action === 'attack') foe.action = 'defend';
      foe.champ.stats.armor = Math.max(5, foe.champ.stats.armor - 15);
    }
    if (id === 'thresh') {
      foe.champ.stats.armor = Math.max(5, foe.champ.stats.armor - 25);
    }
    if (id === 'orianna') {
      foe.champ.stats.armor = Math.max(5, foe.champ.stats.armor - 10);
    }
    if (id === 'sejuani') {
      // freeze first offensive action: mark with counter
      foe.champ.passiveCounter = (foe.champ.passiveCounter || 0) | 0x100;
    }
    if (id === 'ashe') {
      foe.champ.passiveCounter = (foe.champ.passiveCounter || 0) | 0x200; // act last
    }
  };
  applyOne(a, b);
  applyOne(b, a);

  // Yuumi defend passive (buff aplicado en resolveLaneGroup)
  for (const f of [a, b]) {
    if (passiveId(f.champ) === 'you_and_me' && f.action === 'defend') {
      f.champ.passiveCounter = (f.champ.passiveCounter || 0) | 0x400;
    }
  }
}

export function sortDuelOrder(a: FighterLike, b: FighterLike): FighterLike[] {
  const score = (f: FighterLike, foe: FighterLike) => {
    let p = f.champ.stats.attackSpeed * 100 + f.champ.stats.moveSpeed;
    if (f.action === 'attack') p += 10;
    p += modifyPriority(f.champ, f.action, f.ult, foe.champ);
    // Afinidad profesional: hasta ±15 de iniciativa
    const aff = f.champ.playerAffinity;
    if (aff != null) p += Math.round(((aff - 50) / 50) * 15);
    if ((f.champ.passiveCounter || 0) & 0x200) p -= 500; // ashe ult: act last
    if ((foe.champ.passiveCounter || 0) && passiveId(foe.champ) === 'staggering_blow') {
      // first exchange penalty applied via reduce
    }
    if (passiveId(f.champ) === 'frost_shot') {
      // slows foe - foe scored lower when we compare - apply to foe in their score
    }
    return p;
  };
  let sa = score(a, b);
  let sb = score(b, a);
  if (passiveId(a.champ) === 'frost_shot') sb -= 25;
  if (passiveId(b.champ) === 'frost_shot') sa -= 25;
  if (passiveId(a.champ) === 'staggering_blow') sb -= 30;
  if (passiveId(b.champ) === 'staggering_blow') sa -= 30;
  return sa >= sb ? [a, b] : [b, a];
}

export function modifyOutgoingDamage(
  atk: FighterLike,
  def: FighterLike,
  dmg: number,
  action: CombatAction,
  exchange: number,
  laneAllies: Champion[],
): { dmg: number; magic: boolean; execute: boolean; note?: string } {
  let out = dmg;
  let magic = action === 'ability';
  let execute = false;
  let note: string | undefined;
  const pid = passiveId(atk.champ);
  const id = atk.champ.defId;

  // Frozen by Sejuani: skip first offensive action
  if (exchange === 0 && ((atk.champ.passiveCounter || 0) & 0x100) && action !== 'defend') {
    atk.champ.passiveCounter = (atk.champ.passiveCounter || 0) & ~0x100;
    return { dmg: 0, magic: false, execute: false, note: `${defOf(atk.champ).name} queda congelado` };
  }

  if (pid === 'hemorrhage' && action === 'attack') {
    const stacks = Math.min(3, atk.champ.passiveCounter || 0);
    out += stacks * 8;
    atk.champ.passiveCounter = Math.min(3, stacks + 1);
  }

  if (pid === 'umbral_reap' && action === 'attack') {
    out = Math.floor(out * 1.2);
  }

  if (pid === 'flurry' && (atk.champ.passiveCounter || 0) > 0 && (atk.champ.passiveCounter || 0) < 0x100) {
    out = Math.floor(out * 1.15);
  }

  if (pid === 'transcendent' && action === 'ability') out += 12;

  if (pid === 'clockwork_windup') {
    // aura applied to allies when they attack - checked via lane allies having orianna
  }
  const oriannaAlly = laneAllies.find(x => x.instanceId !== atk.champ.instanceId && passiveId(x) === 'clockwork_windup');
  if (oriannaAlly && action === 'attack') out += 8;

  if (pid === 'illuminate' && (atk.champ.passiveCounter || 0) === 1) {
    out += Math.floor(atk.champ.stats.ap * 0.35);
    atk.champ.passiveCounter = 0;
    note = `${defOf(atk.champ).name} detona Iluminación`;
  }

  if (pid === 'rising_spell_force' && action === 'attack' && atk.champ.stats.mana >= 15) {
    atk.champ.stats.mana -= 15;
    out += Math.floor(atk.champ.stats.ap * 0.6);
  }

  if (pid === 'whisper' && action !== 'defend') {
    atk.champ.passiveCounter = (atk.champ.passiveCounter || 0) + 1;
    if (atk.champ.passiveCounter % 4 === 0) {
      out = Math.floor(out * 1.8);
      note = `${defOf(atk.champ).name} dispara la cuarta bala`;
    }
  }

  if (pid === 'headshot' && action === 'attack') {
    atk.champ.passiveCounter = (atk.champ.passiveCounter || 0) + 1;
    if (atk.champ.passiveCounter % 3 === 0) {
      out = Math.floor(out * 1.35);
      note = `${defOf(atk.champ).name} Tiro a la cabeza`;
    }
  }

  if (pid === 'sunlight') {
    def.champ.passiveCounter = (def.champ.passiveCounter || 0) | 0x800; // marked
  }
  if ((def.champ.passiveCounter || 0) & 0x800 && atk.champ.team !== def.champ.team) {
    out += 12;
    def.champ.passiveCounter = (def.champ.passiveCounter || 0) & ~0x800;
  }

  // Leona ult ADC buff flag
  if ((atk.champ.passiveCounter || 0) >= 1000) {
    out += 20;
  }

  // Ultimates
  if (atk.ult) {
    if (id === 'lux' && action === 'ability') out = Math.floor(out * 1.6);
    if (id === 'syndra' && action === 'ability') out += 60;
    if (id === 'orianna' && action === 'ability') out += 30;
    if (id === 'aatrox' && action === 'attack') out += 40;
    if (id === 'sett' && action === 'attack') out += Math.floor(atk.champ.stats.maxHp * 0.08);
    if (id === 'vi' && action === 'attack') out += 35;
    if (id === 'graves' && action === 'attack') out += 30;
    if (id === 'lee_sin') out += 50;
    if (id === 'kayn' && action === 'attack') out += 25;
    if (id === 'ezreal' && action === 'ability') {
      const allies = laneAllies.filter(x => x.team === atk.champ.team && x.isAlive).length;
      out += 45 + allies * 15;
    }
    if (id === 'jinx' && action === 'ability') out += Math.max(20, atk.champ.kills * 20);
    if (id === 'caitlyn' && action === 'attack' && def.champ.stats.hp / def.champ.stats.maxHp < 0.5) out += 25;
    if (id === 'kaisa' && action === 'attack') {
      if (def.champ.stats.hp / def.champ.stats.maxHp < 0.4) {
        execute = true;
        out = def.champ.stats.hp;
        note = `${defOf(atk.champ).name} ejecuta con Instinto asesino`;
      } else out += 30;
    }
    if (id === 'garen' && action === 'attack') {
      const missing = Math.floor(def.champ.stats.maxHp * 0.12);
      out = Math.max(out, missing);
    }
    if (id === 'jhin' && action === 'attack') {
      if (def.champ.stats.hp / def.champ.stats.maxHp < 0.3) {
        execute = true;
        out = def.champ.stats.hp;
        note = `${defOf(atk.champ).name} cierra el acto`;
      } else {
        out = Math.floor(out * 0.25) * 4; // 4 hits totaling same-ish
        note = `${defOf(atk.champ).name} Llamado a escena (×4)`;
      }
    }
    if (id === 'ahri' && action === 'ability') {
      out += 54; // 3×18
      magic = true;
    }
    if (id === 'generic') out += 25;
  }

  return { dmg: out, magic, execute, note };
}

export function shouldIgnoreDefend(atk: FighterLike, action: CombatAction): boolean {
  if (atk.ult && (atk.champ.defId === 'caitlyn' || atk.champ.defId === 'ashe' || atk.champ.defId === 'kayn' || atk.champ.defId === 'lux') && action !== 'defend') {
    return true;
  }
  if (atk.ult && atk.champ.defId === 'vi' && action === 'attack') return true;
  if (passiveId(atk.champ) === 'headshot' && action === 'attack' && (atk.champ.passiveCounter || 0) % 3 === 0) {
    return true;
  }
  return false;
}

export function shouldNullifyIncoming(def: FighterLike, exchange: number): boolean {
  return !!(def.ult && def.champ.defId === 'malphite' && exchange === 0 && def.action === 'defend');
}

export function defendMultiplier(def: FighterLike, exchange: number): number {
  let mult = 0.48;
  if (exchange === 0 && def.action === 'defend' && passiveId(def.champ) === 'frost_armor') {
    mult -= 0.1;
  }
  return Math.max(0.2, mult);
}

export function onAfterHit(
  atk: FighterLike,
  def: FighterLike,
  dealt: number,
  action: CombatAction,
  floats: CombatFloat[],
  log: CombatLogLine[],
  exchange: number,
) {
  const pid = passiveId(atk.champ);
  const id = atk.champ.defId;

  if (pid === 'essence_theft' && action === 'ability' && dealt > 0) {
    const steal = Math.min(20, def.champ.stats.mana);
    def.champ.stats.mana = Math.max(0, def.champ.stats.mana - steal);
    atk.champ.stats.mana = Math.min(atk.champ.stats.maxMana, atk.champ.stats.mana + steal);
    if (steal > 0) pushLog(log, `${defOf(atk.champ).name} roba ${steal} de maná`);
  }

  if (pid === 'illuminate' && action === 'ability') {
    atk.champ.passiveCounter = 1;
  }

  if (pid === 'denting_blows' && action === 'attack' && dealt > 0) {
    def.champ.stats.armor = Math.max(5, def.champ.stats.armor - 4);
  }

  if (pid === 'death_sentence' && action === 'attack' && dealt > 0) {
    def.champ.stats.armor = Math.max(5, def.champ.stats.armor - 3);
  }

  if (atk.ult && id === 'aatrox' && dealt > 0) {
    const heal = Math.floor(dealt * 0.4);
    const before = atk.champ.stats.hp;
    atk.champ.stats.hp = Math.min(atk.champ.stats.maxHp, atk.champ.stats.hp + heal);
    pushHeal(floats, atk.champ.stats.hp - before, atk.champ, atk.champ);
  }

  if (atk.ult && id === 'ahri' && dealt > 0) {
    const before = atk.champ.stats.hp;
    atk.champ.stats.hp = Math.min(atk.champ.stats.maxHp, atk.champ.stats.hp + 55);
    pushHeal(floats, atk.champ.stats.hp - before, atk.champ, atk.champ);
  }

  if (atk.ult && id === 'thresh' && def.action === 'attack') {
    // punish already via armor; reduce their next - handled lightly
  }

  // Sett grit reflect
  if (exchange === 0 && def.action === 'defend' && passiveId(def.champ) === 'grit' && dealt > 0) {
    atk.champ.stats.hp = Math.max(0, atk.champ.stats.hp - 15);
    pushLog(log, `${defOf(def.champ).name} refleja 15 de daño`, 'ulti');
  }

  // Yasuo flow absorb
  if (exchange === 0 && passiveId(def.champ) === 'resolve_flow' && dealt > 0 && (def.champ.passiveCounter || 0) < 50) {
    const absorb = Math.min(40, dealt);
    def.champ.stats.hp = Math.min(def.champ.stats.maxHp, def.champ.stats.hp + absorb);
    def.champ.passiveCounter = 50;
    pushLog(log, `${defOf(def.champ).name} absorbe ${absorb} con Resolución`, 'ulti');
  }
}

export function secondStrikeRatio(atk: FighterLike, action: CombatAction): number | null {
  if (atk.ult && atk.champ.defId === 'yasuo' && action === 'attack') return 0.7;
  return null;
}

export function onKillEffects(
  killer: Champion,
  victim: Champion,
  floats: CombatFloat[],
  log: CombatLogLine[],
  laneEnemies: Champion[],
  usedUlt: boolean,
) {
  const pid = passiveId(killer);
  if (pid === 'blood_well') {
    const heal = Math.floor(killer.stats.maxHp * 0.08);
    const before = killer.stats.hp;
    killer.stats.hp = Math.min(killer.stats.maxHp, killer.stats.hp + heal);
    pushHeal(floats, killer.stats.hp - before, killer, killer);
  }
  if (pid === 'contempt') {
    killer.stats.ad += 10;
    pushLog(log, `${defOf(killer).name} gana +10 AD permanente`, 'ulti');
  }
  if (pid === 'second_skin' && killer.kills >= 2 && (killer.passiveCounter || 0) < 2) {
    killer.stats.ad += 8;
    killer.stats.ap += 12;
    killer.passiveCounter = 2;
    pushLog(log, `${defOf(killer).name} evoluciona Segunda piel`, 'ulti');
  }
  if (pid === 'cursed_touch') {
    for (const e of laneEnemies) {
      if (e.instanceId === victim.instanceId || !e.isAlive) continue;
      e.stats.hp = Math.max(0, e.stats.hp - 35);
      if (e.stats.hp <= 0) e.isAlive = false;
    }
    pushLog(log, `${defOf(killer).name} maldice a la línea`, 'kill');
  }
  if (usedUlt && killer.defId === 'darius') {
    const before = killer.stats.hp;
    killer.stats.hp = Math.min(killer.stats.maxHp, killer.stats.hp + 100);
    pushHeal(floats, killer.stats.hp - before, killer, killer);
    killer.stats.ad += 15;
    pushLog(log, `${defOf(killer).name} Guillotina noxiana`, 'ulti');
  }
  if (usedUlt && killer.defId === 'zed') {
    killer.stats.ad += 20;
    pushLog(log, `${defOf(killer).name} potencia su Marca mortal`, 'ulti');
  }
}

export function postDuelUltDamage(
  atk: FighterLike,
  def: FighterLike,
): number {
  if (atk.ult && atk.champ.defId === 'zed' && def.champ.isAlive && def.champ.stats.hp > 0) {
    return 40;
  }
  return 0;
}

export function postDuelDefendHeal(f: FighterLike): number {
  if (passiveId(f.champ) === 'perseverance' && f.action === 'defend') {
    return Math.floor(f.champ.stats.maxHp * 0.06);
  }
  return 0;
}

export function siegeDamageMult(sieger: Champion): number {
  const pid = passiveId(sieger);
  if (pid === 'end_of_the_line') return 1.3;
  if (pid === 'granite_shield') return 1.15; // malphite still good at towers
  return 1;
}

export function markFlurryIfGanking(champ: Champion, homeLane: LaneId, fightLane: LaneId) {
  if (passiveId(champ) === 'flurry' && homeLane !== fightLane) {
    champ.passiveCounter = 1;
  }
}

export function applyYuumiDefendBuff(team: TeamData, yuumi: Champion, floats: CombatFloat[], log: CombatLogLine[]) {
  if (passiveId(yuumi) !== 'you_and_me') return;
  if (!((yuumi.passiveCounter || 0) & 0x400)) return;
  const adc = allyAdc(team);
  if (!adc) return;
  const before = adc.stats.hp;
  adc.stats.hp = Math.min(adc.stats.maxHp, adc.stats.hp + 20);
  pushHeal(floats, adc.stats.hp - before, yuumi, adc);
  adc.stats.ad += 5;
  pushLog(log, `${defOf(yuumi).name} acompaña a ${defOf(adc).name}`, 'ulti');
}

export function gravesSplashTargets(
  atk: FighterLike,
  primary: Champion,
  laneEnemies: Champion[],
): Champion | null {
  if (!(atk.ult && atk.champ.defId === 'graves')) return null;
  return laneEnemies.find(e => e.instanceId !== primary.instanceId && e.isAlive && e.stats.hp > 0) || null;
}
