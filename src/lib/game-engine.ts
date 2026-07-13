import type {
  Champion, TeamData, GameEvent, SimulationSnapshot,
  Minion, Structure, Position, TeamColor, Role,
} from '@/types/game';
import { BASE_STATS, ITEMS, ITEM_PRIORITY_BY_ROLE, CHAMPIONS } from './game-data';

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
  return {
    instanceId: nextId(),
    defId,
    team,
    stats: { ...BASE_STATS },
    items: [],
    isAlive: true,
    respawnTimer: 0,
    kills: 0,
    position: {
      lane: def.role === 'jungle' ? 1 : laneMap[def.role],
      x: team === 'blue' ? 0.08 : 0.92,
    },
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

  constructor(teamA: TeamData, teamB: TeamData) {
    this.teamBlue = { ...teamA, champions: teamA.champions.map(deepCloneChampion) };
    this.teamRed = { ...teamB, champions: teamB.champions.map(deepCloneChampion) };
    this.champions = [...this.teamBlue.champions, ...this.teamRed.champions];
    this.minions = [];
    this.structures = this.initializeStructures();
    this.events = [];
    this.spawnInitialMinions();
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
    this.resolveAttacks();
    this.resolveAbilities();
    this.checkDeaths();
    this.checkStructures();
    this.processRespawns();

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
        // Support: sigue al ADC del mismo equipo
        const adc = this.champions.find(o => o.team === c.team && getChampionDef(o.defId).role === 'adc');
        if (adc && adc.isAlive) {
          c.position.lane = adc.position.lane;
          c.position.x = adc.team === 'blue' ? adc.position.x - 0.03 : adc.position.x + 0.03;
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

  private resolveAttacks() {
    // Champions attack
    for (const attacker of this.champions) {
      if (!attacker.isAlive) continue;

      const target = this.findBestTarget(attacker);
      if (!target) continue;

      if ('defId' in target) {
        // Attacking champion
        const victim = target as Champion;
        const dmg = this.calculatePhysicalDamage(attacker, victim);
        victim.stats.hp = Math.max(0, victim.stats.hp - dmg);
      } else {
        // Attacking structure
        const struct = target as Structure;
        const dmg = attacker.stats.ad * (1 + attacker.stats.attackSpeed);
        struct.hp = Math.max(0, struct.hp - dmg);
      }
    }

    // Minions attack structures
    for (const m of this.minions) {
      if (m.hp <= 0) continue;
      // Find nearest enemy structure in same lane
      const enemyStruct = this.findNearestEnemyStructure(m);
      if (enemyStruct && this.distance(m.position, enemyStruct.position) < 0.08) {
        enemyStruct.hp = Math.max(0, enemyStruct.hp - 30);
      }
      // Minions also attack enemy minions
      const enemyMinion = this.findNearestEnemyMinion(m);
      if (enemyMinion && this.distance(m.position, enemyMinion.position) < 0.06) {
        enemyMinion.hp -= 40;
      }
    }
  }

  private resolveAbilities() {
    for (const c of this.champions) {
      if (!c.isAlive || c.stats.mana < 50) continue;

      const target = this.findBestTarget(c);
      if (!target || !('defId' in target)) continue;

      const victim = target as Champion;
      // 30% chance to use ability if mana available
      if (Math.random() < 0.3) {
        c.stats.mana -= 50;
        const abilityDmg = c.stats.ap > 0
          ? c.stats.ap * 1.5
          : c.stats.ad * 1.2;
        const mitigation = c.stats.ap > 0
          ? victim.stats.mr / (victim.stats.mr + 100)
          : victim.stats.armor / (victim.stats.armor + 100);
        const dmg = Math.max(10, Math.floor(abilityDmg * (1 - mitigation)));
        victim.stats.hp = Math.max(0, victim.stats.hp - dmg);
      }
    }
  }

  private checkDeaths() {
    for (const c of this.champions) {
      if (!c.isAlive) continue;
      if (c.stats.hp <= 0) {
        c.isAlive = false;
        c.respawnTimer = 5; // 5 steps = revive

        // Find killer
        const possibleKillers = this.champions.filter(k =>
          k.team !== c.team && k.isAlive && this.distance(k.position, c.position) < 0.15
        );
        const killer = possibleKillers[0];

        if (killer) {
          killer.kills++;
          if (killer.team === 'blue') {
            this.teamBlue.kills++;
          } else {
            this.teamRed.kills++;
          }

          const killerDef = getChampionDef(killer.defId);
          const victimDef = getChampionDef(c.defId);

          this.events.push({
            type: 'kill',
            step: this.stepNumber,
            actorTeam: killer.team,
            actorName: killerDef.name,
            targetName: victimDef.name,
            targetTeam: c.team,
            message: `${killerDef.name} mató a ${victimDef.name}`,
            actorInstanceId: killer.instanceId,
          });
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
        if (s.type === 'tower') typeName = 'Torreta';
        else if (s.type === 'inhibitor') typeName = 'Inhibidor';
        else if (s.type === 'nexus') typeName = 'Nexo';

        this.events.push({
          type: s.type === 'tower' ? 'tower_destroyed' : s.type === 'inhibitor' ? 'inhibitor_destroyed' : 'nexus_destroyed',
          step: this.stepNumber,
          message: `${typeName} ${s.team === 'blue' ? 'azul' : 'rojo'} destruido`,
          targetTeam: s.team,
        });
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
  const engine = new GameEngine(teamA, teamB);
  const result = engine.autoSimulateFullMatch();
  return {
    winner: result.winner,
    blueKills: result.blueKills,
    redKills: result.redKills,
  };
}
