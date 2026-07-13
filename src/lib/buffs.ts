import type { Stats } from '@/types/game';

export type BuffId = 'fury' | 'iron' | 'vital' | 'greed';

export interface RoundBuff {
  id: BuffId;
  name: string;
  description: string;
  risk: string;
  apply: (stats: Stats) => Stats;
  riskApply: (stats: Stats) => Stats;
}

export const ROUND_BUFFS: RoundBuff[] = [
  {
    id: 'fury',
    name: 'Furia del Nexo',
    description: '+20 AD / +15 AP a todo el equipo',
    risk: '−10% de vida máxima',
    apply: (s) => ({ ...s, ad: s.ad + 20, ap: s.ap + 15 }),
    riskApply: (s) => ({ ...s, maxHp: Math.floor(s.maxHp * 0.9), hp: Math.floor(s.hp * 0.9) }),
  },
  {
    id: 'iron',
    name: 'Muralla de Hierro',
    description: '+15 Armadura y MR',
    risk: '−12 Velocidad',
    apply: (s) => ({ ...s, armor: s.armor + 15, mr: s.mr + 15 }),
    riskApply: (s) => ({ ...s, moveSpeed: Math.max(70, s.moveSpeed - 12) }),
  },
  {
    id: 'vital',
    name: 'Bendición Vital',
    description: '+120 Vida máxima (curado)',
    risk: '−8 AD',
    apply: (s) => ({ ...s, maxHp: s.maxHp + 120, hp: s.hp + 120 }),
    riskApply: (s) => ({ ...s, ad: Math.max(20, s.ad - 8) }),
  },
  {
    id: 'greed',
    name: 'Codicia del Rift',
    description: '+0.2 Vel. Ataque y +10 movimiento',
    risk: '−10 Armadura',
    apply: (s) => ({ ...s, attackSpeed: s.attackSpeed + 0.2, moveSpeed: s.moveSpeed + 10 }),
    riskApply: (s) => ({ ...s, armor: Math.max(10, s.armor - 10) }),
  },
];

export function applyBuffToStats(stats: Stats, buffId: BuffId): Stats {
  const buff = ROUND_BUFFS.find(b => b.id === buffId);
  if (!buff) return stats;
  return buff.riskApply(buff.apply({ ...stats }));
}
