// ========== TIPOS BASE ==========

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support';
export type TeamColor = 'blue' | 'red';
export type GameScreen =
  | 'home'
  | 'championSelect'
  | 'bracket'
  | 'victory'
  | 'defeat'
  | 'tournamentWin';

export type BuffId = 'fury' | 'iron' | 'vital' | 'greed';
export type CombatAction = 'attack' | 'ability' | 'defend';
export type LaneId = 0 | 1 | 2; // top, mid, bot
export type ObjectiveType =
  | 'dragon_fire'
  | 'dragon_water'
  | 'baron'
  | 'dragon_ancestral'
  | null;

export interface ChampionPassive {
  id: string;
  name: string;
  description: string;
}

export interface ChampionUltimate {
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
  cost: number;
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
  ultimate?: ChampionUltimate;
}

export interface Item {
  defId: string;
}

export interface Position {
  lane: number;
  x: number;
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
  gold: number;
  tearStacks: number;
  burnPending: number;
  ultimateUsed: boolean;
  siegeStacks: number;
  revealedAction?: CombatAction | null;
}

export interface Structure {
  id: string;
  type: 'tower' | 'inhibitor' | 'nexus';
  team: TeamColor;
  lane: number;
  hp: number;
  maxHp: number;
  position: Position;
  isDestroyed: boolean;
}

export interface TeamData {
  id: string;
  name: string;
  color: TeamColor;
  champions: Champion[];
  nexusHp: number;
  maxNexusHp: number;
  kills: number;
  score: number;
  damageBuff: number;
}

export interface TeamPlan {
  /** instanceId -> action */
  actions: Record<string, CombatAction>;
  /** jungle assist target lane or objective */
  jungleTarget?: LaneId | 'objective';
  /** ally instanceId that leaves lane to help jungle on objective */
  objectiveAssistId?: string;
  /** boots: optional lane relocate per champ */
  bootsLane?: Record<string, LaneId>;
  /** instanceIds using ultimate this round */
  ultimates: string[];
}

export interface CombatLogLine {
  id: string;
  text: string;
  tone: 'neutral' | 'kill' | 'tower' | 'objective' | 'ulti' | 'section';
}

export interface DuelFighterSummary {
  instanceId: string;
  name: string;
  image: string | null;
  action: CombatAction;
  usedUlt: boolean;
  hpBefore: number;
  hpAfter: number;
  maxHp: number;
  isAlive: boolean;
  damageDealt: number;
}

export interface DuelSummary {
  id: string;
  lane: LaneId;
  kind: 'duel' | 'siege';
  blue?: DuelFighterSummary;
  red?: DuelFighterSummary;
  summary: string;
}

export interface RoundResolution {
  round: number;
  log: CombatLogLine[];
  duels: DuelSummary[];
  blueScoreDelta: number;
  redScoreDelta: number;
  blueKillsDelta: number;
  redKillsDelta: number;
  towersTakenBlue: number;
  towersTakenRed: number;
  objective?: ObjectiveType;
  objectiveWinner?: TeamColor | null;
  contestedObjective?: boolean;
  awardedFreeItem?: boolean;
  ancestralGranted?: boolean;
  matchOver: boolean;
  winner: TeamColor | null;
  autoNexus: boolean;
}

export interface TurnMatchState {
  blue: TeamData;
  red: TeamData;
  round: number;
  maxRounds: number;
  objective: ObjectiveType;
  structures: Structure[];
  lastResolution: RoundResolution | null;
  isComplete: boolean;
  winner: TeamColor | null;
  pendingReward: boolean;
}

export interface Match {
  id: string;
  round: number;
  roundName: string;
  teamA: TeamData;
  teamB: TeamData;
  winner: TeamColor | null;
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

export interface SelectedChampion {
  defId: string;
  role: Role;
}

export interface Minion {
  id: string;
  team: TeamColor;
  lane: number;
  position: Position;
  hp: number;
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

/** Compat con motor legacy / snapshots */
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
  blueScore?: number;
  redScore?: number;
}

