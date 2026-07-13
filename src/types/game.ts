// ========== TIPOS BASE ==========

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support';
export type TeamColor = 'blue' | 'red';
export type GameScreen =
  | 'home'
  | 'championSelect'
  | 'bracket'
  | 'simulation'
  | 'itemSelect'
  | 'victory'
  | 'defeat'
  | 'tournamentWin';

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
  image: string | null; // null = usar avatar CSS
  color: string; // color para avatar CSS
  initials: string;
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

export interface GameEvent {
  type: 'kill' | 'tower_destroyed' | 'inhibitor_destroyed' | 'nexus_destroyed' | 'minion_spawn' | 'respawn' | 'step';
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
