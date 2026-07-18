// ========== TIPOS BASE ==========

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support';
export type TeamColor = 'blue' | 'red';
export type GameMode = 'ai' | 'coop_local' | 'coop_code';

export type GameScreen =
  | 'modeSelect'
  | 'lobby'
  | 'home'
  | 'rosterSelect'
  | 'championSelect'
  | 'bracket'
  | 'liveMatch'
  | 'victory'
  | 'defeat'
  | 'tournamentWin';

export interface LobbyPlayer {
  id: string;
  /** Nombre del jugador en el lobby (etiqueta). */
  name: string;
  /** Nombre del equipo que usará en el torneo. */
  teamName: string;
  isHost: boolean;
}

export type PlayerStyle =
  | 'assassin'
  | 'mage'
  | 'tank'
  | 'bruiser'
  | 'marksman'
  | 'engage'
  | 'peel'
  | 'siege'
  | 'skirmish'
  | 'scaling'
  | 'mechanical'
  | 'macro';

export type SynergyTier = 'baja' | 'media' | 'alta' | 'firma';

export interface RosterMember {
  id: string;
  name: string;
  role: Role;
  image: string;
  orgId: string;
  orgName: string;
  mechanics: number;
  macro: number;
  styles: PlayerStyle[];
  signatureChampionIds: string[];
}
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
  /** Estilos de juego para sinergia con profesionales. */
  styles?: PlayerStyle[];
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
  deaths: number;
  assists: number;
  position: Position;
  gold: number;
  tearStacks: number;
  burnPending: number;
  /** Turnos restantes hasta poder usar la definitiva (0 = lista). */
  ultimateCooldown: number;
  siegeStacks: number;
  /** Robo de vida acumulado (0–1), p.ej. Dragón Ancestral. */
  lifeSteal: number;
  /** Turnos que este campeón no peleará (p.ej. escapó del QTE). */
  skipTurns: number;
  /** Sin maná: vuelve a base y pierde el turno. */
  recallingForMana: boolean;
  /** Contador persistente de pasiva (p.ej. cuarta bala de Jhin). */
  passiveCounter: number;
  revealedAction?: CombatAction | null;
  /** Jugador profesional vinculado (sinergia). */
  rosterMemberId?: string;
  playerName?: string;
  playerMechanics?: number;
  playerMacro?: number;
  /** Afinidad 0–100 con el campeón. */
  playerAffinity?: number;
  /** Multiplicador de potencia de combate 0.90–1.20. */
  playerCombatMultiplier?: number;
  synergyTier?: SynergyTier;
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
  /** Roster de la organización (o el del jugador) para sinergia. */
  rosterMembers?: RosterMember[];
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
  /** Torre o nexo asediado (solo kind === 'siege'). */
  siegeTargetId?: string;
}

export interface CombatFloat {
  id: string;
  kind: 'damage' | 'heal';
  amount: number;
  targetType: 'champ' | 'tower' | 'nexus';
  targetId: string;
  sourceName?: string;
  /** Atacante / sanador (para beam cinematográfico). */
  sourceId?: string;
  sourceTeam?: TeamColor;
  /** Nombre legible del objetivo: "Amumu", "Torre Superior", "Nexo". */
  targetName?: string;
  /** Equipo del objetivo (perspectiva aliado/enemigo del jugador azul). */
  targetTeam?: TeamColor;
  lane?: LaneId;
}

export interface PendingObjective {
  /** Objetivo de mapa, pelea jungla, defensa del nexo o asalto al nexo enemigo. */
  kind: 'objective' | 'gank' | 'nexus_defense' | 'nexus_assault';
  contested: boolean;
  blueIds: string[];
  redIds: string[];
  objective: ObjectiveType | null;
  /** Línea del choque / asalto al nexo. */
  lane?: LaneId;
}

export interface ObjectiveQteResult {
  /** Quién gana la escaramuza 2v2; null si no hubo contested. */
  skirmishWinner: TeamColor | null;
  /** Equipo que pelea al monstruo. */
  attackingTeam: TeamColor;
  /** true si el monstruo cae. */
  monsterTaken: boolean;
  /**
   * Destino del perdedor de la escaramuza contested (2v2 / 2v1).
   * killed = mueren los participantes; escaped = vivos pero pierden el próximo turno.
   */
  loserFate?: 'killed' | 'escaped';
}

export interface KillAnnounce {
  id: string;
  killerName: string;
  victimNames: string[];
  /** 1 = kill simple; 2–5 = multi-kill del mismo campeón. */
  multi: number;
  team: TeamColor;
}

export interface ObjectiveBonusAnnounce {
  id: string;
  objective: NonNullable<ObjectiveType>;
  title: string;
  bonusText: string;
  recipients: string[];
  team: TeamColor;
  teamName: string;
}

export interface RoundResolution {
  round: number;
  log: CombatLogLine[];
  duels: DuelSummary[];
  floats: CombatFloat[];
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
  /** Necesita QTE del jugador antes de cerrar la ronda. */
  pendingObjectiveQte?: boolean;
  killAnnounces?: KillAnnounce[];
  objectiveBonus?: ObjectiveBonusAnnounce | null;
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
  pendingObjective: PendingObjective | null;
  /** Planes guardados hasta resolver el objetivo diferido. */
  deferredBluePlan: TeamPlan | null;
  deferredRedPlan: TeamPlan | null;
}

export interface ChampionMatchStats {
  defId: string;
  playerName: string;
  role: Role;
  kills: number;
  deaths: number;
  assists: number;
}

export interface TeamMatchStats {
  teamId: string;
  teamName: string;
  totalKills: number;
  totalDeaths: number;
  champions: ChampionMatchStats[];
}

export interface MatchResultSummary {
  scoreBlue: number;
  scoreRed: number;
  blue: TeamMatchStats;
  red: TeamMatchStats;
  endedByNexus?: boolean;
}

export interface HumanTeamSetup {
  lobbyPlayerId: string;
  teamName: string;
  fanOrgId: string | null;
  roster: RosterMember[];
  champions: Champion[];
  champToRoster: Record<string, string>;
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
  resultSummary?: MatchResultSummary | null;
  humanTeamIds?: string[];
  isPvpMatch?: boolean;
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
  titles: string[];
  championFrame: 'none' | 'gold';
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

