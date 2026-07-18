import type { RoundResolution, RosterMember, TurnMatchState } from '@/types/game';
import { CHAMPIONS, ROLE_NAMES, objectiveName } from '@/lib/game-data';
import type { Role } from '@/types/game';

const STORAGE_KEY = 'ligadeduelo_player_runs_v1';
const MAX_STORED = 80;

const ROLE_ORDER: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];

export interface RunMatchRecord {
  opponent: string;
  playerKills: number;
  enemyKills: number;
  won: boolean;
  objectives: { label: string; taken: boolean }[];
}

export interface PlayerRunRecord {
  id: string;
  teamName: string;
  players: string[];
  champions: string[];
  kills: number;
  deaths: number;
  playTimeMs: number;
  finishedAt: number;
  matches: RunMatchRecord[];
  /** Posición del torneo (ej. "1º · Campeón del torneo"). */
  placement?: string;
  wonTournament?: boolean;
}

type ActiveRun = {
  teamName: string;
  players: string[];
  champions: string[];
  startedAt: number;
  kills: number;
  deaths: number;
  matches: RunMatchRecord[];
};

export type FinalizeRunMeta = {
  placement?: string;
  wonTournament?: boolean;
};

let activeRun: ActiveRun | null = null;
let currentMatchObjectives: { label: string; taken: boolean }[] = [];

function readAll(): PlayerRunRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlayerRunRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: PlayerRunRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, MAX_STORED)));
  } catch {
    /* ignore */
  }
}

export function getLeaderboard(): PlayerRunRecord[] {
  return readAll().sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills;
    return b.finishedAt - a.finishedAt;
  });
}

export function deleteRun(id: string): void {
  writeAll(readAll().filter(r => r.id !== id));
}

export function clearAllRuns(): void {
  writeAll([]);
}

export function formatPlayTime(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function beginPlayerRun(
  teamName: string,
  roster: RosterMember[],
  championDefIds: string[],
) {
  const players = ROLE_ORDER.map(role => roster.find(r => r.role === role)?.name || '—');
  const champions = ROLE_ORDER.map(role => {
    const champ = CHAMPIONS.find(c => championDefIds.includes(c.id) && c.role === role);
    return champ?.name || '—';
  });
  activeRun = {
    teamName: teamName.trim() || 'Sin nombre',
    players,
    champions,
    startedAt: Date.now(),
    kills: 0,
    deaths: 0,
    matches: [],
  };
  currentMatchObjectives = [];
}

export function resetCurrentMatchObjectives() {
  currentMatchObjectives = [];
}

export function noteObjectiveFromResolution(res: RoundResolution | null | undefined) {
  if (!res?.objective) return;
  const label = `R${res.round}: ${objectiveName(res.objective)}`;
  const taken = res.objectiveWinner === 'blue';
  const idx = currentMatchObjectives.findIndex(o => o.label.startsWith(`R${res.round}:`));
  if (idx >= 0) {
    currentMatchObjectives[idx] = { label, taken };
    return;
  }
  currentMatchObjectives.push({ label, taken });
}

export function recordPlayerMatchEnd(
  turnMatch: TurnMatchState,
  opponentName: string,
  playerWon: boolean,
) {
  if (!activeRun) return;
  const playerKills = turnMatch.blue.kills;
  const enemyKills = turnMatch.red.kills;
  activeRun.kills += playerKills;
  activeRun.deaths += enemyKills;
  activeRun.matches.push({
    opponent: opponentName,
    playerKills,
    enemyKills,
    won: playerWon,
    objectives: [...currentMatchObjectives],
  });
  currentMatchObjectives = [];
}

export function finalizePlayerRun(meta?: FinalizeRunMeta) {
  if (!activeRun) return;
  if (activeRun.matches.length === 0) {
    activeRun = null;
    currentMatchObjectives = [];
    return;
  }
  const entry: PlayerRunRecord = {
    id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    teamName: activeRun.teamName,
    players: activeRun.players,
    champions: activeRun.champions,
    kills: activeRun.kills,
    deaths: activeRun.deaths,
    playTimeMs: Date.now() - activeRun.startedAt,
    finishedAt: Date.now(),
    matches: activeRun.matches.slice(-4),
    placement: meta?.placement,
    wonTournament: meta?.wonTournament,
  };
  const all = readAll();
  writeAll([entry, ...all]);
  activeRun = null;
  currentMatchObjectives = [];
}

/** Texto listo para volver a compartir la jugada por WhatsApp. */
export function buildRunShareText(entry: PlayerRunRecord): string {
  const header = entry.wonTournament
    ? `¡Soy campeón de Liga de Duelo con ${entry.teamName}!`
    : `Jugué Liga de Duelo con ${entry.teamName}`;
  const place = entry.placement ? `Posición: ${entry.placement}` : null;
  const roster = ROLE_ORDER.map((role, i) => {
    const player = entry.players[i] || '—';
    const champ = entry.champions[i] || '—';
    return `• ${ROLE_NAMES[role]}: ${player} → ${champ}`;
  }).join('\n');
  const matchLines = entry.matches.length > 0
    ? entry.matches
      .map(m => `${m.won ? '✓' : '✗'} vs ${m.opponent} (${m.playerKills}–${m.enemyKills})`)
      .join('\n')
    : null;
  const stats = `Bajas ${entry.kills} · Recibidas ${entry.deaths} · ${formatPlayTime(entry.playTimeMs)}`;
  return [
    header,
    place,
    stats,
    '',
    'Mi equipo:',
    roster,
    matchLines ? '' : null,
    matchLines ? 'Partidas:' : null,
    matchLines,
    '',
    '¿Te atreves a jugar?',
    'https://ligadeduelo.vercel.app/',
  ]
    .filter(line => line !== null && line !== undefined)
    .join('\n');
}

export function shareRunOnWhatsApp(entry: PlayerRunRecord) {
  const text = buildRunShareText(entry);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
