export const MAX_QTE_REPLAYS_PER_MATCH = 3;

export function qteReplaysRemaining(used: number): number {
  return Math.max(0, MAX_QTE_REPLAYS_PER_MATCH - used);
}

export function canReplayQte(used: number): boolean {
  return qteReplaysRemaining(used) > 0;
}
