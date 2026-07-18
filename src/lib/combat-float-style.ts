import type { CombatFloat, TeamColor } from '@/types/game';

const BLUE = '#3498DB';
const RED = '#E74C3C';
const GREEN = '#2ECC71';
const GOLD = '#C9A84C';

export type CombatFloatStyle = {
  primary: string;
  secondary: string;
  fill: string;
  textFill: string;
  glow: string;
};

function damageColor(team: TeamColor | undefined): string {
  if (team === 'blue') return BLUE;
  if (team === 'red') return RED;
  return GOLD;
}

/** Paleta común desde la perspectiva del jugador azul. */
export function combatFloatStyle(
  kind: CombatFloat['kind'],
  sourceTeam: TeamColor | undefined,
): CombatFloatStyle {
  if (kind === 'damage') {
    const color = damageColor(sourceTeam);
    return {
      primary: color,
      secondary: color,
      fill: color,
      textFill: color,
      glow: color,
    };
  }

  const primary = sourceTeam === 'red' ? GREEN : BLUE;
  const secondary = sourceTeam === 'red' ? RED : GREEN;
  const gradient = `linear-gradient(90deg, ${primary} 0 50%, ${secondary} 50% 100%)`;
  return {
    primary,
    secondary,
    fill: gradient,
    textFill: gradient,
    glow: GREEN,
  };
}
