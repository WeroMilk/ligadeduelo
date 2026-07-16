import type { GameEvent } from '@/types/game';

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
