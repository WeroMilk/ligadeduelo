import type { CombatFloat, GameEvent, LaneId } from '@/types/game';

function laneNameEs(lane: LaneId): string {
  return lane === 0 ? 'Superior' : lane === 1 ? 'Central' : 'Inferior';
}

/**
 * Narrativa de un golpe para el popup cinematográfico.
 * Ej: "Jhin le hizo -400 de vida a Amumu"
 *     "Garen le hizo -200 puntos a la torre enemiga del Superior"
 */
export function formatCombatHitNarrative(hit: CombatFloat): string {
  const amount = Math.floor(hit.amount);
  const source = hit.sourceName?.trim() || null;
  const target = hit.targetName?.trim() || null;

  if (hit.kind === 'heal') {
    const t = target || 'un aliado';
    if (source && hit.sourceId === hit.targetId) {
      return `${source} recuperó +${amount} de vida`;
    }
    if (source) return `${source} curó a ${t} +${amount} de vida`;
    return `${t} recuperó +${amount} de vida`;
  }

  if (hit.targetType === 'champ') {
    const t = target || 'un rival';
    if (source) return `${source} le hizo -${amount} de vida a ${t}`;
    return `Daño a ${t} -${amount}`;
  }

  if (hit.targetType === 'tower') {
    const lane = hit.lane !== undefined && hit.lane !== null
      ? laneNameEs(hit.lane as LaneId)
      : null;
    const side = hit.targetTeam === 'blue' ? 'aliada' : hit.targetTeam === 'red' ? 'enemiga' : null;
    const towerPhrase = side && lane
      ? `la torre ${side} del ${lane}`
      : side
        ? `la torre ${side}`
        : lane
          ? `la torre del ${lane}`
          : (target ? `la ${target.toLowerCase()}` : 'la torre');
    if (source) return `${source} le hizo -${amount} puntos a ${towerPhrase}`;
    return `Daño a ${towerPhrase} -${amount}`;
  }

  const side =
    hit.targetTeam === 'blue' ? 'aliado' :
    hit.targetTeam === 'red' ? 'enemigo' : null;
  const nexusPhrase = side ? `el nexo ${side}` : 'el nexo';
  if (source) return `${source} dañó ${nexusPhrase} -${amount} puntos`;
  return `Daño a ${nexusPhrase} -${amount}`;
}

const KILL_LINES = [
  (a: string, v: string) => `${a} mandó a ${v} de vacaciones… permanentes.`,
  (a: string, v: string) => `${v} olvidó que ${a} existía. Ya no.`,
  (a: string, v: string) => `${a} firmó el autógrafo en la cara de ${v}.`,
  (a: string, v: string) => `${v} preguntó cuánto falta para revivir… ${a} no contestó.`,
  (a: string, v: string) => `${a} cocinó a ${v}. Estaba en su punto.`,
  (a: string, v: string) => `${v} lo apostó todo. ${a} se lo llevó completo.`,
];

const TOWER_LINES = [
  (a: string) => `${a} derribó una torreta. El nexo tiembla un poco.`,
  (a: string) => `Torreta abajo. ${a} cobra horas extra.`,
  () => `Una torreta menos. La Grieta aprueba este caos.`,
];

const MULTI: Record<number, string> = {
  2: '¡DOBLE BAJA!',
  3: '¡TRIPLE BAJA!',
  4: '¡CUÁDRUPLE BAJA!',
  5: '¡PENTABAJA!',
};

export function comicKillLine(actor: string, victim: string): string {
  const fn = KILL_LINES[Math.floor(Math.random() * KILL_LINES.length)];
  return fn(actor, victim);
}

export function comicTowerLine(actor?: string): string {
  const fn = TOWER_LINES[Math.floor(Math.random() * TOWER_LINES.length)];
  return fn(actor || 'Un equipo');
}

export function multiKillTitle(streak: number): string | null {
  return MULTI[streak] || (streak > 5 ? '¡DIOS DE LA GRIETA!' : null);
}

export function enrichEventMessage(e: GameEvent): string {
  if (
    (e.type === 'kill' || e.type === 'first_blood' || e.type === 'double_kill'
      || e.type === 'triple_kill' || e.type === 'quadra_kill')
    && e.actorName && e.targetName
  ) {
    const prefix =
      e.type === 'first_blood' ? '¡PRIMERA SANGRE!' :
      e.type === 'double_kill' ? '¡DOBLE BAJA!' :
      e.type === 'triple_kill' ? '¡TRIPLE BAJA!' :
      e.type === 'quadra_kill' ? '¡CUÁDRUPLE BAJA!' : '';
    const comic = comicKillLine(e.actorName, e.targetName);
    return prefix ? `${prefix} ${comic}` : comic;
  }
  if (e.type === 'tower_destroyed') {
    return comicTowerLine(e.actorName);
  }
  if (e.type === 'inhibitor_destroyed') {
    return `¡Inhibidor destruido! ${e.actorName || 'Alguien'} abrió la puerta al nexo.`;
  }
  if (e.type === 'nexus_destroyed') {
    return `¡NEXO ROTADO! La partida se escribe en piedra.`;
  }
  return e.message;
}

export type FeedTone = 'kill' | 'first' | 'multi' | 'tower' | 'other';

export interface FeedItem {
  id: string;
  text: string;
  tone: FeedTone;
  step: number;
}
