import type {
  Champion, TeamData, GameEvent, SimulationSnapshot,
  Minion, Structure, Position, TeamColor, Role,
} from '@/types/game';
import { ITEMS, ITEM_PRIORITY_BY_ROLE, CHAMPIONS, getChampionBaseStats } from './game-data';
import { enrichEventMessage } from './combat-flavor';
import { applyBuffToStats, type BuffId } from './buffs';
import { simulateAITurnMatch } from './turn-engine';

let instanceCounter = 0;
function nextId() { return `e${++instanceCounter}`; }

function deepCloneChampion(c: Champion): Champion {
  return {
    ...c,
    stats: { ...c.stats },
    items: c.items.map(i => ({ ...i })),
    position: { ...c.position },
  };
}

function createChampion(defId: string, team: TeamColor): Champion {
  const def = CHAMPIONS.find(c => c.id === defId)!;
  const laneMap: Record<Role, number> = { top: 0, jungle: 1, mid: 1, adc: 2, support: 2 };
  const xSpread: Record<Role, number> = { top: 0, jungle: 0.05, mid: 0, adc: 0, support: 0.09 };
  const baseX = team === 'blue' ? 0.08 + xSpread[def.role] : 0.92 - xSpread[def.role];
  return {
    instanceId: nextId(),
    defId,
    team,
    stats: getChampionBaseStats(defId),
    items: [],
    isAlive: true,
    respawnTimer: 0,
    kills: 0,
    position: {
      lane: def.role === 'jungle' ? 1 : laneMap[def.role],
      x: baseX,
    },
    gold: 100,
    tearStacks: 0,
    burnPending: 0,
    ultimateUsed: false,
    siegeStacks: 0,
  };
}

export function createTeam(id: string, name: string, color: TeamColor, championDefIds: string[]): TeamData {
  return {
    id,
    name,
    color,
    champions: championDefIds.map(cid => createChampion(cid, color)),
    nexusHp: 3000,
    maxNexusHp: 3000,
    kills: 0,
    score: 0,
    damageBuff: 0,
  };
}

export function getChampionDef(defId: string) {
  return CHAMPIONS.find(c => c.id === defId)!;
}

export function getItemDef(defId: string) {
  return ITEMS.find(i => i.id === defId)!;
}

function getRolePriority(role: Role): number {
  const p: Record<Role, number> = { top: 0, jungle: 1, mid: 1, adc: 2, support: 2 };
  return p[role];
}

export class GameEngine {
  private teamBlue: TeamData;
  private teamRed: TeamData;
  private champions: Champion[];
  private minions: Minion[];
  private structures: Structure[];
  private events: GameEvent[];
  private stepNumber: number = 0;
  private minionSpawnTimer: number = 0;
  private firstBloodDone = false;
  private killStreak: Record<string, number> = {};
  private asBuffTurns: Record<string, number> = {};
  private flurryActive: Record<string, number> = {};
  private evolved = new Set<string>();
  private lastLane: Record<string, number> = {};

  constructor(teamA: TeamData, teamB: TeamData, blueBuffId?: BuffId | null) {
    this.teamBlue = { ...teamA, champions: teamA.champions.map(deepCloneChampion) };
    this.teamRed = { ...teamB, champions: teamB.champions.map(deepCloneChampion) };
    if (blueBuffId) {
      for (const c of this.teamBlue.champions) {
        c.stats = applyBuffToStats(c.stats, blueBuffId);
      }
    }
    this.champions = [...this.teamBlue.champions, ...this.teamRed.champions];
    this.minions = [];
    this.structures = this.initializeStructures();
    this.events = [];
    this.spawnInitialMinions();
    this.separateChampions();
    for (const c of this.champions) {
      this.lastLane[c.instanceId] = c.position.lane;
    }
  }

  private initializeStructures(): Structure[] {
    const s: Structure[] = [];
    // Towers in all three lanes
    for (const lane of [0, 1, 2]) {
      s.push({ id: nextId(), type: 'tower', team: 'blue', lane, hp: 2000, maxHp: 2000, position: { lane, x: 0.28 }, isDestroyed: false });
      s.push({ id: nextId(), type: 'tower', team: 'red', lane, hp: 2000, maxHp: 2000, position: { lane, x: 0.72 }, isDestroyed: false });
    }
    // Inhibitors (inner mid pylons)
    s.push({ id: nextId(), type: 'inhibitor', team: 'blue', lane: 1, hp: 1500, maxHp: 1500, position: { lane: 1, x: 0.12 }, isDestroyed: false });
    s.push({ id: nextId(), type: 'inhibitor', team: 'red', lane: 1, hp: 1500, maxHp: 1500, position: { lane: 1, x: 0.88 }, isDestroyed: false });
    // Nexuses
    s.push({ id: 'nexus_blue', type: 'nexus', team: 'blue', lane: -1, hp: 3000, maxHp: 3000, position: { lane: 1, x: 0.04 }, isDestroyed: false });
    s.push({ id: 'nexus_red', type: 'nexus', team: 'red', lane: -1, hp: 3000, maxHp: 3000, position: { lane: 1, x: 0.96 }, isDestroyed: false });
    return s;
  }

  private spawnInitialMinions() {
    for (let lane = 0; lane < 3; lane++) {
      for (let i = 0; i < 3; i++) {
        this.minions.push({
          id: nextId(), team: 'blue', lane,
          position: { lane, x: 0.1 + i * 0.03 },
          hp: 100,
        });
        this.minions.push({
          id: nextId(), team: 'red', lane,
          position: { lane, x: 0.9 - i * 0.03 },
          hp: 100,
        });
      }
    }
  }

  // ========== PUBLIC API ==========

  getInitialSnapshot(): SimulationSnapshot {
    return this.createSnapshot();
  }

  step(): SimulationSnapshot {
    this.stepNumber++;
    this.minionSpawnTimer++;

    this.spawnMinionsIfNeeded();
    this.moveMinions();
    this.moveChampions();
    this.separateChampions();
    this.applyPassiveTick();
    this.resolveAttacks();
    this.resolveAbilities();
    this.checkDeaths();
    this.checkStructures();
    this.processRespawns();
    this.tickBuffTimers();

    // Every 2 turns: AI equips one item for each red champion
    if (this.stepNumber > 0 && this.stepNumber % 2 === 0) {
      for (const c of this.champions) {
        if (c.team === 'red' && c.items.length < 6) {
          this.aiAutoEquip(c);
        }
      }
    }

    return this.createSnapshot();
  }

  equipItem(championInstanceId: string, itemDefId: string, replaceIndex?: number) {
    const champ = this.champions.find(c => c.instanceId === championInstanceId);
    if (!champ) return;

    if (replaceIndex !== undefined && replaceIndex >= 0 && replaceIndex < champ.items.length) {
      // Remove stats from old item
      const oldItem = champ.items[replaceIndex];
      this.removeItemStats(champ, oldItem.defId);
      champ.items[replaceIndex] = { defId: itemDefId };
    } else if (champ.items.length < 6) {
      champ.items.push({ defId: itemDefId });
    } else {
      // Replace first item if full
      const oldItem = champ.items[0];
      this.removeItemStats(champ, oldItem.defId);
      champ.items[0] = { defId: itemDefId };
    }

    this.applyItemStats(champ, itemDefId);
  }

  aiAutoEquip(champion: Champion) {
    const def = getChampionDef(champion.defId);
    const priority = ITEM_PRIORITY_BY_ROLE[def.role];
    const availableItems = ITEMS.filter(item => !champion.items.find(i => i.defId === item.id));

    if (availableItems.length === 0) {
      // Replace least useful
      const allItemDefs = champion.items.map(i => getItemDef(i.defId));
      const leastUseful = allItemDefs[0];
      const replaceIndex = champion.items.findIndex(i => i.defId === leastUseful.id);
      const newItem = ITEMS.find(i => i.id === priority[0]) || ITEMS[0];
      this.equipItem(champion.instanceId, newItem.id, replaceIndex);
      return;
    }

    for (const itemId of priority) {
      const item = availableItems.find(i => i.id === itemId);
      if (item) {
        this.equipItem(champion.instanceId, item.id);
        return;
      }
    }

    this.equipItem(champion.instanceId, availableItems[0].id);
  }

  autoSimulateFullMatch(): { winner: TeamColor; events: GameEvent[]; blueKills: number; redKills: number } {
    let safety = 0;
    const allEvents: GameEvent[] = [...this.events];

    while (safety < 500) {
      safety++;
      const snap = this.step();
      // Blue team also auto-equips in AI matches (no UI)
      if (snap.step > 0 && snap.step % 2 === 0) {
        for (const c of this.champions) {
          if (c.team === 'blue' && c.items.length < 6) {
            this.aiAutoEquip(c);
          }
        }
      }
      allEvents.push(...snap.events);
      if (snap.isComplete) {
        return {
          winner: snap.winner!,
          events: allEvents,
          blueKills: snap.blueKills,
          redKills: snap.redKills,
        };
      }
    }

    // Fallback: compare nexus HP
    const blueNexus = this.structures.find(s => s.id === 'nexus_blue');
    const redNexus = this.structures.find(s => s.id === 'nexus_red');
    const winner = (blueNexus!.hp >= redNexus!.hp) ? 'blue' : 'red';
    return { winner, events: allEvents, blueKills: this.teamBlue.kills, redKills: this.teamRed.kills };
  }

  // ========== INTERNAL LOGIC ==========

  private spawnMinionsIfNeeded() {
    if (this.minionSpawnTimer >= 5) {
      this.minionSpawnTimer = 0;
      for (let lane = 0; lane < 3; lane++) {
        this.minions.push({
          id: nextId(), team: 'blue', lane,
          position: { lane, x: 0.05 },
          hp: 100,
        });
        this.minions.push({
          id: nextId(), team: 'red', lane,
          position: { lane, x: 0.95 },
          hp: 100,
        });
      }
      this.events.push({
        type: 'minion_spawn', step: this.stepNumber,
        message: 'Nuevos minions han aparecido',
      });
    }
  }

  private moveMinions() {
    for (const m of this.minions) {
      if (m.hp <= 0) continue;
      const speed = 0.03;
      if (m.team === 'blue') {
        m.position.x = Math.min(0.98, m.position.x + speed);
      } else {
        m.position.x = Math.max(0.02, m.position.x - speed);
      }
    }
    // Remove dead/out of bounds minions
    this.minions = this.minions.filter(m => m.hp > 0 && m.position.x >= 0 && m.position.x <= 1);
  }

  private moveChampions() {
    for (const c of this.champions) {
      if (!c.isAlive) continue;
      const def = getChampionDef(c.defId);

      if (def.role === 'jungle') {
        // Jungla: salta entre top / mid / bot cada turno
        const current = c.position.lane;
        const others = [0, 1, 2].filter(l => l !== current);
        c.position.lane = others[Math.floor(Math.random() * others.length)];
        // Queda cerca del centro del mapa, entre bases
        const midX = 0.35 + Math.random() * 0.3;
        c.position.x = c.team === 'blue'
          ? Math.min(0.7, midX)
          : Math.max(0.3, midX);
      } else if (def.role === 'support') {
        // Support: sigue al ADC del mismo equipo, con espacio para no solaparse
        const adc = this.champions.find(o => o.team === c.team && getChampionDef(o.defId).role === 'adc');
        if (adc && adc.isAlive) {
          c.position.lane = adc.position.lane;
          c.position.x = adc.team === 'blue' ? adc.position.x - 0.09 : adc.position.x + 0.09;
        }
      } else {
        // Top/Mid/ADC: avanzan lentamente por su carril
        const moveSpeed = 0.01 * (c.stats.moveSpeed / 100);
        if (c.team === 'blue') {
          c.position.x = Math.min(0.95, c.position.x + moveSpeed);
        } else {
          c.position.x = Math.max(0.05, c.position.x - moveSpeed);
        }
      }
    }
  }

  /** Evita que campeones de la misma línea se amontonen. */
  private separateChampions() {
    const minGap = 0.085;
    for (let lane = 0; lane < 3; lane++) {
      const inLane = this.champions
        .filter(c => c.isAlive && c.position.lane === lane)
        .sort((a, b) => a.position.x - b.position.x);
      if (inLane.length < 2) continue;

      for (let pass = 0; pass < 3; pass++) {
        for (let i = 1; i < inLane.length; i++) {
          const minX = inLane[i - 1].position.x + minGap;
          if (inLane[i].position.x < minX) {
            inLane[i].position.x = Math.min(0.96, minX);
          }
        }
        for (let i = inLane.length - 2; i >= 0; i--) {
          const maxX = inLane[i + 1].position.x - minGap;
          if (inLane[i].position.x > maxX) {
            inLane[i].position.x = Math.max(0.04, maxX);
          }
        }
      }
    }
  }

  private tickBuffTimers() {
    for (const id of Object.keys(this.asBuffTurns)) {
      this.asBuffTurns[id]--;
      if (this.asBuffTurns[id] <= 0) {
        const champ = this.champions.find(c => c.instanceId === id);
        if (champ) champ.stats.attackSpeed = Math.max(0.5, champ.stats.attackSpeed - 0.3);
        delete this.asBuffTurns[id];
      }
    }
    for (const id of Object.keys(this.flurryActive)) {
      this.flurryActive[id]--;
      if (this.flurryActive[id] <= 0) delete this.flurryActive[id];
    }
  }

  private applyPassiveTick() {
    for (const c of this.champions) {
      if (!c.isAlive) continue;
      const def = getChampionDef(c.defId);
      const pid = def.passive.id;

      if (pid === 'regen') {
        c.stats.hp = Math.min(c.stats.maxHp, c.stats.hp + Math.floor(c.stats.maxHp * 0.03));
      }
      if (pid === 'salvation' || pid === 'guard' || pid === 'pix') {
        const ally = this.champions
          .filter(o => o.team === c.team && o.isAlive && o.instanceId !== c.instanceId)
          .sort((a, b) => (a.stats.hp / a.stats.maxHp) - (b.stats.hp / b.stats.maxHp))[0];
        if (ally) {
          const heal = pid === 'salvation'
            ? 40 + Math.floor(c.stats.ap * 0.2)
            : pid === 'pix'
              ? 25 + Math.floor(c.stats.ap * 0.15)
              : 30;
          ally.stats.hp = Math.min(ally.stats.maxHp, ally.stats.hp + heal);
        }
      }
      if (pid === 'flurry') {
        const prev = this.lastLane[c.instanceId];
        if (prev !== undefined && prev !== c.position.lane) {
          this.flurryActive[c.instanceId] = 2;
        }
        this.lastLane[c.instanceId] = c.position.lane;
      }
    }
  }

  private resolveAttacks() {
    // Champions attack
    for (const attacker of this.champions) {
      if (!attacker.isAlive) continue;

      const target = this.findBestTarget(attacker);
      if (!target) continue;

      if ('defId' in target) {
        const victim = target as Champion;
        let dmg = this.calculatePhysicalDamage(attacker, victim);
        dmg = this.applyOnHitPassives(attacker, victim, dmg);
        victim.stats.hp = Math.max(0, victim.stats.hp - dmg);
        // Darius execute
        const aDef = getChampionDef(attacker.defId);
        if (aDef.passive.id === 'execute' && victim.stats.hp > 0 && victim.stats.hp / victim.stats.maxHp < 0.2) {
          victim.stats.hp = 0;
        }
      } else {
        const struct = target as Structure;
        let dmg = attacker.stats.ad * (1 + attacker.stats.attackSpeed);
        const aDef = getChampionDef(attacker.defId);
        if (aDef.passive.id === 'fortify' || aDef.passive.id === 'blast') {
          dmg *= aDef.passive.id === 'blast' ? 1.3 : 1.25;
        }
        struct.hp = Math.max(0, struct.hp - dmg);
      }
    }

    // Minions attack structures
    for (const m of this.minions) {
      if (m.hp <= 0) continue;
      const enemyStruct = this.findNearestEnemyStructure(m);
      if (enemyStruct && this.distance(m.position, enemyStruct.position) < 0.08) {
        enemyStruct.hp = Math.max(0, enemyStruct.hp - 30);
      }
      const enemyMinion = this.findNearestEnemyMinion(m);
      if (enemyMinion && this.distance(m.position, enemyMinion.position) < 0.06) {
        enemyMinion.hp -= 40;
      }
    }
  }

  private applyOnHitPassives(attacker: Champion, victim: Champion, dmg: number): number {
    const def = getChampionDef(attacker.defId);
    const pid = def.passive.id;
    let out = dmg;

    if (pid === 'shadow') {
      out = Math.floor(out * 1.25);
    }
    if (this.flurryActive[attacker.instanceId]) {
      out = Math.floor(out * 1.15);
    }
    if (pid === 'headshot' && Math.random() < 0.25) {
      out = Math.floor(out * 1.6);
    }
    if (pid === 'essence') {
      const steal = Math.min(25, victim.stats.mana);
      victim.stats.mana -= steal;
      attacker.stats.mana = Math.min(attacker.stats.maxMana, attacker.stats.mana + steal);
    }
    if (pid === 'rising' && attacker.stats.mana >= 20) {
      attacker.stats.mana -= 20;
      out += Math.floor(attacker.stats.ap * 0.8);
    }
    if (pid === 'hook') {
      victim.stats.armor = Math.max(5, victim.stats.armor - 3);
      const pull = attacker.team === 'blue' ? -0.04 : 0.04;
      victim.position.x = Math.max(0.05, Math.min(0.95, victim.position.x + pull));
    }
    if (pid === 'sunlight') {
      const allyCount = this.champions.filter(o =>
        o.team === attacker.team && o.isAlive && o.instanceId !== attacker.instanceId
        && this.distance(o.position, victim.position) < 0.15
      ).length;
      if (allyCount > 0) {
        victim.stats.hp = Math.max(0, victim.stats.hp - 12 * allyCount);
      }
    }
    return out;
  }

  private resolveAbilities() {
    for (const champ of this.champions) {
      if (!champ.isAlive || champ.stats.mana < 50) continue;
      const target = this.findBestTarget(champ);
      if (!target || !('defId' in target)) continue;
      if (Math.random() >= 0.3) continue;

      const victim = target as Champion;
      champ.stats.mana -= 50;
      const def = getChampionDef(champ.defId);
      let abilityDmg = champ.stats.ap > 0 ? champ.stats.ap * 1.5 : champ.stats.ad * 1.2;
      if (def.passive.id === 'illumination' && Math.random() < 0.25) {
        abilityDmg += champ.stats.ap * 0.4;
      }
      const mitigation = champ.stats.ap > 0
        ? victim.stats.mr / (victim.stats.mr + 100)
        : victim.stats.armor / (victim.stats.armor + 100);
      const dmg = Math.max(10, Math.floor(abilityDmg * (1 - mitigation)));
      victim.stats.hp = Math.max(0, victim.stats.hp - dmg);

      this.events.push({
        type: 'ability',
        step: this.stepNumber,
        actorTeam: champ.team,
        actorName: def.name,
        message: `${def.name} lanzó una habilidad`,
        actorInstanceId: champ.instanceId,
      });
    }
  }

  private applyKillPassives(killer: Champion) {
    const def = getChampionDef(killer.defId);
    const pid = def.passive.id;
    if (pid === 'contempt') killer.stats.ad += 12;
    if (pid === 'getexcited') killer.stats.attackSpeed += 0.15;
    if (pid === 'flow') {
      if (!this.asBuffTurns[killer.instanceId]) killer.stats.attackSpeed += 0.3;
      this.asBuffTurns[killer.instanceId] = 2;
    }
    if (pid === 'evolve' && killer.kills >= 2 && !this.evolved.has(killer.instanceId)) {
      this.evolved.add(killer.instanceId);
      killer.stats.ad += 10;
      killer.stats.ap += 15;
    }
    if (pid === 'tears') {
      for (const enemy of this.champions) {
        if (enemy.team === killer.team || !enemy.isAlive) continue;
        if (this.distance(enemy.position, killer.position) < 0.2) {
          enemy.stats.hp = Math.max(0, enemy.stats.hp - 40);
        }
      }
    }
  }

  private checkDeaths() {
    for (const c of this.champions) {
      if (!c.isAlive) continue;
      if (c.stats.hp <= 0) {
        c.isAlive = false;
        c.respawnTimer = 5;
        this.killStreak[c.instanceId] = 0;

        const possibleKillers = this.champions.filter(k =>
          k.team !== c.team && k.isAlive && this.distance(k.position, c.position) < 0.18
        );
        const killer = possibleKillers[0];

        if (killer) {
          killer.kills++;
          if (killer.team === 'blue') this.teamBlue.kills++;
          else this.teamRed.kills++;

          const streak = (this.killStreak[killer.instanceId] || 0) + 1;
          this.killStreak[killer.instanceId] = streak;
          this.applyKillPassives(killer);

          const killerDef = getChampionDef(killer.defId);
          const victimDef = getChampionDef(c.defId);

          let eventType: GameEvent['type'] = 'kill';
          if (!this.firstBloodDone) {
            this.firstBloodDone = true;
            eventType = 'first_blood';
          } else if (streak === 2) eventType = 'double_kill';
          else if (streak === 3) eventType = 'triple_kill';
          else if (streak >= 4) eventType = 'quadra_kill';

          const evt: GameEvent = {
            type: eventType,
            step: this.stepNumber,
            actorTeam: killer.team,
            actorName: killerDef.name,
            targetName: victimDef.name,
            targetTeam: c.team,
            message: `${killerDef.name} mató a ${victimDef.name}`,
            actorInstanceId: killer.instanceId,
          };
          evt.message = enrichEventMessage(evt);
          this.events.push(evt);
        }
      }
    }
  }

  private checkStructures() {
    for (const s of this.structures) {
      if (s.isDestroyed) continue;
      if (s.hp <= 0) {
        s.isDestroyed = true;
        let typeName = '';
        let eventType: GameEvent['type'] = 'tower_destroyed';
        if (s.type === 'tower') { typeName = 'Torreta'; eventType = 'tower_destroyed'; }
        else if (s.type === 'inhibitor') { typeName = 'Inhibidor'; eventType = 'inhibitor_destroyed'; }
        else if (s.type === 'nexus') { typeName = 'Nexo'; eventType = 'nexus_destroyed'; }

        const evt: GameEvent = {
          type: eventType,
          step: this.stepNumber,
          message: `${typeName} ${s.team === 'blue' ? 'azul' : 'rojo'} destruido`,
          targetTeam: s.team,
        };
        evt.message = enrichEventMessage(evt);
        this.events.push(evt);
      }
    }
  }

  private processRespawns() {
    for (const c of this.champions) {
      if (c.isAlive) continue;
      c.respawnTimer--;
      if (c.respawnTimer <= 0) {
        c.isAlive = true;
        c.stats.hp = c.stats.maxHp;
        c.stats.mana = c.stats.maxMana;
        c.position.x = c.team === 'blue' ? 0.05 : 0.95;
        const def = getChampionDef(c.defId);
        c.position.lane = def.role === 'jungle' ? 1 : getRolePriority(def.role);
        this.events.push({
          type: 'respawn',
          step: this.stepNumber,
          actorTeam: c.team,
          actorName: def.name,
          message: `${def.name} ha revivido`,
        });
      }
    }
  }

  // ========== TARGETING ==========

  private findBestTarget(attacker: Champion): Champion | Structure | null {
    const enemies = this.champions.filter(c => c.team !== attacker.team && c.isAlive);
    const enemyStructs = this.structures.filter(s => s.team !== attacker.team && !s.isDestroyed);
    const laneEnemies = enemies.filter(c => c.position.lane === attacker.position.lane);

    // Priority 1: Low HP champion in same lane
    const lowHp = laneEnemies.filter(c => c.stats.hp / c.stats.maxHp < 0.3);
    if (lowHp.length > 0) {
      return lowHp.reduce((a, b) => a.stats.hp < b.stats.hp ? a : b);
    }

    // Priority 2: Any champion in same lane close by
    const closeEnemies = laneEnemies.filter(c => this.distance(c.position, attacker.position) < 0.12);
    if (closeEnemies.length > 0) {
      return closeEnemies[0];
    }

    // Priority 3: Structure in same lane close by
    const closeStructs = enemyStructs.filter(s =>
      (s.lane === attacker.position.lane || s.lane === -1) &&
      this.distance(s.position, attacker.position) < 0.15
    );
    if (closeStructs.length > 0) {
      return closeStructs[0];
    }

    // Priority 4: Any enemy champion
    if (enemies.length > 0) {
      return enemies.reduce((a, b) =>
        this.distance(a.position, attacker.position) < this.distance(b.position, attacker.position) ? a : b
      );
    }

    return null;
  }

  private findNearestEnemyStructure(m: Minion): Structure | null {
    const enemyTeam: TeamColor = m.team === 'blue' ? 'red' : 'blue';
    const structs = this.structures.filter(s => s.team === enemyTeam && !s.isDestroyed && (s.lane === m.lane || s.lane === -1));
    if (structs.length === 0) return null;
    return structs.reduce((a, b) =>
      this.distance(m.position, a.position) < this.distance(m.position, b.position) ? a : b
    );
  }

  private findNearestEnemyMinion(m: Minion): Minion | null {
    const enemies = this.minions.filter(o => o.team !== m.team && o.hp > 0 && o.lane === m.lane);
    if (enemies.length === 0) return null;
    return enemies.reduce((a, b) =>
      this.distance(m.position, a.position) < this.distance(m.position, b.position) ? a : b
    );
  }

  // ========== DAMAGE CALCULATION ==========

  private calculatePhysicalDamage(attacker: Champion, target: Champion): number {
    const baseDamage = attacker.stats.ad * (1 + attacker.stats.attackSpeed);
    const mitigation = target.stats.armor / (target.stats.armor + 100);
    return Math.max(5, Math.floor(baseDamage * (1 - mitigation)));
  }

  // ========== ITEM STATS ==========

  private applyItemStats(champ: Champion, itemDefId: string) {
    const itemDef = getItemDef(itemDefId);
    if (itemDef.statBonus.maxHp) {
      champ.stats.maxHp += itemDef.statBonus.maxHp;
      champ.stats.hp += itemDef.statBonus.maxHp;
    }
    if (itemDef.statBonus.maxMana) {
      champ.stats.maxMana += itemDef.statBonus.maxMana;
      champ.stats.mana += itemDef.statBonus.maxMana;
    }
    if (itemDef.statBonus.ad) champ.stats.ad += itemDef.statBonus.ad;
    if (itemDef.statBonus.ap) champ.stats.ap += itemDef.statBonus.ap;
    if (itemDef.statBonus.attackSpeed) champ.stats.attackSpeed += itemDef.statBonus.attackSpeed;
    if (itemDef.statBonus.armor) champ.stats.armor += itemDef.statBonus.armor;
    if (itemDef.statBonus.mr) champ.stats.mr += itemDef.statBonus.mr;
    if (itemDef.statBonus.moveSpeed) champ.stats.moveSpeed += itemDef.statBonus.moveSpeed;
  }

  private removeItemStats(champ: Champion, itemDefId: string) {
    const itemDef = getItemDef(itemDefId);
    if (itemDef.statBonus.maxHp) {
      champ.stats.maxHp -= itemDef.statBonus.maxHp;
      champ.stats.hp = Math.min(champ.stats.hp, champ.stats.maxHp);
    }
    if (itemDef.statBonus.maxMana) {
      champ.stats.maxMana -= itemDef.statBonus.maxMana;
      champ.stats.mana = Math.min(champ.stats.mana, champ.stats.maxMana);
    }
    if (itemDef.statBonus.ad) champ.stats.ad -= itemDef.statBonus.ad;
    if (itemDef.statBonus.ap) champ.stats.ap -= itemDef.statBonus.ap;
    if (itemDef.statBonus.attackSpeed) champ.stats.attackSpeed -= itemDef.statBonus.attackSpeed;
    if (itemDef.statBonus.armor) champ.stats.armor -= itemDef.statBonus.armor;
    if (itemDef.statBonus.mr) champ.stats.mr -= itemDef.statBonus.mr;
    if (itemDef.statBonus.moveSpeed) champ.stats.moveSpeed -= itemDef.statBonus.moveSpeed;
  }

  // ========== UTILS ==========

  private distance(a: Position, b: Position): number {
    const laneDist = Math.abs(a.lane - b.lane) * 0.3;
    const xDist = Math.abs(a.x - b.x);
    return Math.sqrt(laneDist * laneDist + xDist * xDist);
  }

  private createSnapshot(): SimulationSnapshot {
    return {
      champions: this.champions.map(deepCloneChampion),
      minions: this.minions.map(m => ({ ...m, position: { ...m.position } })),
      structures: this.structures.map(s => ({ ...s, position: { ...s.position } })),
      events: [...this.events],
      step: this.stepNumber,
      isComplete: this.checkVictoryCondition(),
      winner: this.determineWinner(),
      blueKills: this.teamBlue.kills,
      redKills: this.teamRed.kills,
    };
  }

  private checkVictoryCondition(): boolean {
    const blueNexus = this.structures.find(s => s.id === 'nexus_blue');
    const redNexus = this.structures.find(s => s.id === 'nexus_red');
    return !!((blueNexus && blueNexus.hp <= 0) || (redNexus && redNexus.hp <= 0));
  }

  private determineWinner(): TeamColor | null {
    if (!this.checkVictoryCondition()) return null;
    const blueNexus = this.structures.find(s => s.id === 'nexus_blue');
    if (blueNexus && blueNexus.hp <= 0) return 'red';
    return 'blue';
  }

  // ========== GETTERS ==========

  getBlueTeam() { return this.teamBlue; }
  getRedTeam() { return this.teamRed; }
  getChampions() { return this.champions; }
}

// ========== SIMULATION FOR AI VS AI ==========

export function simulateAIMatch(teamA: TeamData, teamB: TeamData): { winner: TeamColor; blueKills: number; redKills: number } {
  const result = simulateAITurnMatch(teamA, teamB);
  return {
    winner: result.winner,
    blueKills: result.blueKills,
    redKills: result.redKills,
  };
}
