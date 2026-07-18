import type { CombatFloat, TeamColor } from '@/types/game';

const RED = '#E74C3C';
const BLOOD = '#C0392B';
const GREEN = '#2ECC71';
const BLUE = '#3498DB';

export type CombatFloatStyle = {
  primary: string;
  secondary: string;
  fill: string;
  textFill: string;
  glow: string;
  /** Color del signo +/-. */
  signColor: string;
  /** Color del número (curación: azul o rojo según equipo). */
  numberColor: string;
};

/** Paleta común desde la perspectiva del jugador azul. */
export function combatFloatStyle(
  kind: CombatFloat['kind'],
  sourceTeam: TeamColor | undefined,
): CombatFloatStyle {
  if (kind === 'damage') {
    return {
      primary: RED,
      secondary: BLOOD,
      fill: BLOOD,
      textFill: RED,
      glow: RED,
      signColor: RED,
      numberColor: RED,
    };
  }

  const teamColor = sourceTeam === 'red' ? RED : BLUE;
  const gradient = `linear-gradient(90deg, ${GREEN} 0 50%, ${teamColor} 50% 100%)`;
  return {
    primary: GREEN,
    secondary: teamColor,
    fill: gradient,
    textFill: gradient,
    glow: GREEN,
    signColor: GREEN,
    numberColor: teamColor,
  };
}
