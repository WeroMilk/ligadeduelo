// ========== TIPOS BASE ==========

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support';
export type TeamColor = 'blue' | 'red';
export type GameScreen =
  | 'home'
  | 'championSelect'
  | 'bracket'
  | 'buffSelect'
  | 'simulation'
  | 'itemSelect'
  | 'victory'
  | 'defeat'
  | 'tournamentWin';

export type BuffId = 'fury' | 'iron' | 'vital' | 'greed';

export interface ChampionPassive {
  id: string;
  name: string;
  description: string;
}

export interface Stats {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  ad: number;
  ap: number;
  attackSpeed: number;
  armor: number;
  mr: number;
  moveSpeed: number;
}

export interface ItemDef {
  id: string;
  name: string;
  image: string;
  statBonus: Partial<Stats>;
  description: string;
}

export interface ChampionDef {
  id: string;
  name: string;
  role: Role;
  image: string | null;
  color: string;
  initials: string;
  baseStats: Stats;
  passive: ChampionPassive;
}

export interface Item {
  defId: string;
}

export interface Champion {
  instanceId: string;
  defId: string;
  team: TeamColor;
  stats: Stats;
  items: Item[];
  isAlive: boolean;
  respawnTimer: number;
  kills: number;
  position: Position;
}

export interface Position {
  lane: number; // 0=top, 1=mid, 2=bot
  x: number; // 0.0 to 1.0 (distance from blue side)
}

export interface Structure {
  id: string;
  type: 'tower' | 'inhibitor' | 'nexus';
  team: TeamColor;
  lane: number; // -1 for nexus
  hp: number;
  maxHp: number;
  position: Position;
  isDestroyed: boolean;
}

export interface Minion {
  id: string;
  team: TeamColor;
  lane: number;
  position: Position;
  hp: number;
}

export interface TeamData {
  id: string;
  name: string;
  color: TeamColor;
  champions: Champion[];
  nexusHp: number;
  maxNexusHp: number;
  kills: number;
}

export type GameEventType =
  | 'kill'
  | 'first_blood'
  | 'double_kill'
  | 'triple_kill'
  | 'quadra_kill'
  | 'tower_destroyed'
  | 'inhibitor_destroyed'
  | 'nexus_destroyed'
  | 'minion_spawn'
  | 'respawn'
  | 'ability'
  | 'step';

export interface GameEvent {
  type: GameEventType;
  step: number;
  actorTeam?: TeamColor;
  actorName?: string;
  targetName?: string;
  targetTeam?: TeamColor;
  message: string;
  actorInstanceId?: string;
}

export interface Match {
  id: string;
  round: number;
  roundName: string;
  teamA: TeamData;
  teamB: TeamData;
  winner: TeamColor | null;
  events: GameEvent[];
  isPlayerMatch: boolean;
  isSimulated: boolean;
}

export interface Round {
  round: number;
  roundName: string;
  matches: Match[];
}

export interface Tournament {
  rounds: Round[];
  playerTeam: TeamData;
  currentRound: number;
  isComplete: boolean;
  champion: TeamData | null;
  rivalTeamId: string;
  titles: string[];
  championFrame: 'none' | 'gold' | 'obsidian';
}

export interface SimulationSnapshot {
  champions: Champion[];
  minions: Minion[];
  structures: Structure[];
  events: GameEvent[];
  step: number;
  isComplete: boolean;
  winner: TeamColor | null;
  blueKills: number;
  redKills: number;
}

export interface SelectedChampion {
  defId: string;
  role: Role;
}
