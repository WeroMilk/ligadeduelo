import type { ChampionDef, PlayerStyle, Role, RosterMember, SynergyTier } from '@/types/game';
import { CHAMPIONS } from '@/lib/game-data';

export type { PlayerStyle, SynergyTier };

export interface PlayerCombatProfile {
  name: string;
  role: Role;
  mechanics: number;
  macro: number;
  styles: PlayerStyle[];
  signatureChampionIds: string[];
}

export interface SynergyResult {
  affinity: number;
  multiplier: number;
  initiativeBonus: number;
  mitigationBonus: number;
  tier: SynergyTier;
  isSignature: boolean;
  label: string;
}

const ROLE_DEFAULTS: Record<Role, Omit<PlayerCombatProfile, 'name' | 'role'>> = {
  top: {
    mechanics: 78,
    macro: 76,
    styles: ['bruiser', 'tank', 'siege'],
    signatureChampionIds: ['darius', 'garen', 'malphite'],
  },
  jungle: {
    mechanics: 80,
    macro: 82,
    styles: ['skirmish', 'engage', 'assassin'],
    signatureChampionIds: ['lee_sin', 'vi', 'graves'],
  },
  mid: {
    mechanics: 86,
    macro: 84,
    styles: ['mage', 'mechanical', 'scaling'],
    signatureChampionIds: ['ahri', 'syndra', 'orianna'],
  },
  adc: {
    mechanics: 84,
    macro: 78,
    styles: ['marksman', 'scaling', 'siege'],
    signatureChampionIds: ['caitlyn', 'jinx', 'kaisa'],
  },
  support: {
    mechanics: 76,
    macro: 86,
    styles: ['peel', 'engage', 'macro'],
    signatureChampionIds: ['thresh', 'leona', 'lulu'],
  },
};

/** Estilos de cada campeón del roster jugable. */
export const CHAMPION_STYLES: Record<string, PlayerStyle[]> = {
  darius: ['bruiser', 'skirmish'],
  garen: ['bruiser', 'tank'],
  malphite: ['tank', 'engage', 'siege'],
  shen: ['tank', 'peel', 'macro'],
  aatrox: ['bruiser', 'skirmish', 'scaling'],
  sett: ['bruiser', 'engage'],
  lee_sin: ['assassin', 'skirmish', 'mechanical'],
  amumu: ['tank', 'engage'],
  kayn: ['assassin', 'skirmish', 'scaling'],
  vi: ['bruiser', 'engage', 'skirmish'],
  graves: ['skirmish', 'siege', 'marksman'],
  sejuani: ['tank', 'engage', 'macro'],
  ahri: ['mage', 'assassin', 'mechanical'],
  lux: ['mage', 'siege'],
  zed: ['assassin', 'mechanical', 'skirmish'],
  yasuo: ['assassin', 'mechanical', 'skirmish'],
  syndra: ['mage', 'siege', 'mechanical'],
  orianna: ['mage', 'macro', 'peel'],
  caitlyn: ['marksman', 'siege'],
  jinx: ['marksman', 'scaling'],
  ezreal: ['marksman', 'mage', 'mechanical'],
  kaisa: ['marksman', 'assassin', 'scaling'],
  ashe: ['marksman', 'macro', 'siege'],
  jhin: ['marksman', 'siege', 'mechanical'],
  leona: ['engage', 'tank'],
  thresh: ['engage', 'peel', 'mechanical'],
  lulu: ['peel', 'mage'],
  soraka: ['peel', 'mage', 'macro'],
  nautilus: ['engage', 'tank'],
  yuumi: ['peel', 'mage', 'scaling'],
};

/** Firmas y ratings conocidos (clave = nombre en minúsculas sin espacios). */
const PLAYER_OVERRIDES: Record<string, Partial<PlayerCombatProfile>> = {
  faker: {
    mechanics: 98,
    macro: 97,
    styles: ['assassin', 'mage', 'mechanical', 'scaling', 'macro'],
    signatureChampionIds: ['zed', 'ahri', 'syndra'],
  },
  chovy: {
    mechanics: 96,
    macro: 94,
    styles: ['mage', 'scaling', 'mechanical', 'macro'],
    signatureChampionIds: ['ahri', 'syndra', 'orianna'],
  },
  showmaker: {
    mechanics: 93,
    macro: 90,
    styles: ['assassin', 'mage', 'mechanical'],
    signatureChampionIds: ['zed', 'ahri', 'yasuo'],
  },
  caps: {
    mechanics: 94,
    macro: 88,
    styles: ['mage', 'assassin', 'mechanical'],
    signatureChampionIds: ['ahri', 'zed', 'syndra'],
  },
  canyon: {
    mechanics: 95,
    macro: 96,
    styles: ['skirmish', 'macro', 'engage'],
    signatureChampionIds: ['lee_sin', 'graves', 'vi'],
  },
  oner: {
    mechanics: 92,
    macro: 91,
    styles: ['skirmish', 'engage', 'macro'],
    signatureChampionIds: ['lee_sin', 'vi', 'sejuani'],
  },
  ruler: {
    mechanics: 95,
    macro: 90,
    styles: ['marksman', 'scaling', 'siege'],
    signatureChampionIds: ['kaisa', 'jinx', 'caitlyn'],
  },
  gumayusi: {
    mechanics: 93,
    macro: 89,
    styles: ['marksman', 'siege', 'scaling'],
    signatureChampionIds: ['jinx', 'caitlyn', 'jhin'],
  },
  keria: {
    mechanics: 94,
    macro: 95,
    styles: ['peel', 'engage', 'mechanical', 'macro'],
    signatureChampionIds: ['thresh', 'lulu', 'yuumi'],
  },
  delight: {
    mechanics: 90,
    macro: 91,
    styles: ['engage', 'peel', 'macro'],
    signatureChampionIds: ['leona', 'nautilus', 'thresh'],
  },
  doran: {
    mechanics: 88,
    macro: 86,
    styles: ['bruiser', 'tank', 'siege'],
    signatureChampionIds: ['aatrox', 'sett', 'garen'],
  },
  kiin: {
    mechanics: 92,
    macro: 90,
    styles: ['bruiser', 'tank', 'siege'],
    signatureChampionIds: ['aatrox', 'malphite', 'sett'],
  },
  zeus: {
    mechanics: 94,
    macro: 88,
    styles: ['bruiser', 'assassin', 'skirmish'],
    signatureChampionIds: ['aatrox', 'sett', 'darius'],
  },
  theshy: {
    mechanics: 93,
    macro: 84,
    styles: ['bruiser', 'skirmish', 'mechanical'],
    signatureChampionIds: ['aatrox', 'darius', 'sett'],
  },
  viper: {
    mechanics: 94,
    macro: 90,
    styles: ['marksman', 'scaling', 'siege'],
    signatureChampionIds: ['kaisa', 'jinx', 'ezreal'],
  },
  elk: {
    mechanics: 92,
    macro: 88,
    styles: ['marksman', 'scaling'],
    signatureChampionIds: ['kaisa', 'jinx', 'ashe'],
  },
  knight: {
    mechanics: 94,
    macro: 91,
    styles: ['mage', 'scaling', 'mechanical'],
    signatureChampionIds: ['ahri', 'syndra', 'orianna'],
  },
  bin: {
    mechanics: 91,
    macro: 85,
    styles: ['bruiser', 'engage', 'skirmish'],
    signatureChampionIds: ['aatrox', 'sett', 'malphite'],
  },
  kanavi: {
    mechanics: 93,
    macro: 90,
    styles: ['assassin', 'skirmish', 'mechanical'],
    signatureChampionIds: ['kayn', 'lee_sin', 'vi'],
  },
  peanut: {
    mechanics: 91,
    macro: 92,
    styles: ['skirmish', 'macro', 'engage'],
    signatureChampionIds: ['lee_sin', 'graves', 'sejuani'],
  },
  bdd: {
    mechanics: 90,
    macro: 93,
    styles: ['mage', 'macro', 'scaling'],
    signatureChampionIds: ['orianna', 'ahri', 'syndra'],
  },
  zeka: {
    mechanics: 91,
    macro: 88,
    styles: ['mage', 'assassin', 'mechanical'],
    signatureChampionIds: ['ahri', 'zed', 'yasuo'],
  },
  duro: {
    mechanics: 86,
    macro: 88,
    styles: ['engage', 'peel', 'macro'],
    signatureChampionIds: ['leona', 'nautilus', 'thresh'],
  },
  aiming: {
    mechanics: 88,
    macro: 84,
    styles: ['marksman', 'siege', 'scaling'],
    signatureChampionIds: ['jinx', 'caitlyn', 'kaisa'],
  },
  beryl: {
    mechanics: 89,
    macro: 92,
    styles: ['engage', 'peel', 'macro'],
    signatureChampionIds: ['thresh', 'leona', 'nautilus'],
  },
  jackeylove: {
    mechanics: 93,
    macro: 87,
    styles: ['marksman', 'mechanical', 'scaling'],
    signatureChampionIds: ['kaisa', 'jinx', 'ezreal'],
  },
  hanssama: {
    mechanics: 90,
    macro: 86,
    styles: ['marksman', 'scaling', 'siege'],
    signatureChampionIds: ['kaisa', 'caitlyn', 'ashe'],
  },
  brokenblade: {
    mechanics: 89,
    macro: 85,
    styles: ['bruiser', 'tank', 'siege'],
    signatureChampionIds: ['aatrox', 'sett', 'malphite'],
  },
  meiko: {
    mechanics: 90,
    macro: 93,
    styles: ['peel', 'engage', 'macro'],
    signatureChampionIds: ['thresh', 'lulu', 'yuumi'],
  },
  scout: {
    mechanics: 91,
    macro: 89,
    styles: ['mage', 'assassin', 'mechanical'],
    signatureChampionIds: ['ahri', 'zed', 'syndra'],
  },
  nuguri: {
    mechanics: 90,
    macro: 84,
    styles: ['bruiser', 'skirmish'],
    signatureChampionIds: ['aatrox', 'sett', 'darius'],
  },
  lehends: {
    mechanics: 88,
    macro: 90,
    styles: ['engage', 'peel', 'mechanical'],
    signatureChampionIds: ['thresh', 'leona', 'lulu'],
  },
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function keyName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, '');
}

export function getChampionStyles(defId: string): PlayerStyle[] {
  return CHAMPION_STYLES[defId] || [];
}

/** Asegura que ChampionDef.styles esté poblado (mutación idempotente). */
export function ensureChampionStyles(): void {
  for (const c of CHAMPIONS) {
    if (!c.styles || c.styles.length === 0) {
      c.styles = getChampionStyles(c.id);
    }
  }
}

ensureChampionStyles();

function definedOnly<T extends Record<string, unknown>>(obj: T | undefined): Partial<T> {
  if (!obj) return {};
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Partial<T>)[k as keyof T] = v as T[keyof T];
  }
  return out;
}

export function resolvePlayerProfile(
  name: string,
  role: Role,
  overrides?: Partial<PlayerCombatProfile>,
): PlayerCombatProfile {
  const base = ROLE_DEFAULTS[role];
  const ov = {
    ...definedOnly(PLAYER_OVERRIDES[keyName(name)] as Record<string, unknown>),
    ...definedOnly(overrides as Record<string, unknown> | undefined),
  } as Partial<PlayerCombatProfile>;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const jitter = (h % 11) - 5;
  return {
    name,
    role,
    mechanics: clamp(ov.mechanics ?? base.mechanics + jitter, 60, 99),
    macro: clamp(ov.macro ?? base.macro + ((h >> 3) % 9) - 4, 60, 99),
    styles: ov.styles ?? base.styles,
    signatureChampionIds: ov.signatureChampionIds ?? base.signatureChampionIds,
  };
}

export function computeSynergy(player: PlayerCombatProfile, champ: ChampionDef): SynergyResult {
  const skill = player.mechanics * 0.65 + player.macro * 0.35;
  const champStyles = champ.styles?.length ? champ.styles : getChampionStyles(champ.id);
  const overlap = champStyles.filter(s => player.styles.includes(s)).length;
  const styleScore = champStyles.length
    ? (overlap / Math.max(1, champStyles.length)) * 100
    : 50;
  const isSignature = player.signatureChampionIds.includes(champ.id);
  const roleMatch = player.role === champ.role ? 100 : 40;

  let affinity = skill * 0.45 + styleScore * 0.30 + roleMatch * 0.15;
  if (isSignature) affinity += 22;
  else affinity += overlap * 4;
  affinity = clamp(Math.round(affinity), 0, 100);

  const multiplier = clamp(0.90 + (affinity / 100) * 0.30, 0.9, 1.2);
  const initiativeBonus = Math.round(((affinity - 50) / 50) * 15);
  const mitigationBonus = clamp(((affinity - 50) / 50) * 0.08, 0, 0.08);

  let tier: SynergyTier = 'baja';
  if (isSignature || affinity >= 90) tier = 'firma';
  else if (affinity >= 75) tier = 'alta';
  else if (affinity >= 50) tier = 'media';

  const label = `${affinity}%`;

  return {
    affinity,
    multiplier: Math.round(multiplier * 100) / 100,
    initiativeBonus,
    mitigationBonus: Math.round(mitigationBonus * 1000) / 1000,
    tier,
    isSignature,
    label,
  };
}

/** Color/estilo UI según tier de dominio (mismo criterio en badge y texto). */
export function synergyUiStyle(syn: SynergyResult): {
  label: string;
  badgeClassName: string;
  textClassName: string;
  accentColor: string;
} {
  const label = syn.isSignature ? `★ ${syn.affinity}%` : `${syn.affinity}%`;

  switch (syn.tier) {
    case 'firma':
      return {
        label,
        badgeClassName: 'bg-[#2ECC71]/25 text-[#2ECC71] border-[#2ECC71]',
        textClassName: 'text-[#2ECC71]',
        accentColor: '#2ECC71',
      };
    case 'alta':
      return {
        label,
        badgeClassName: 'bg-[#27AE60]/20 text-[#27AE60] border-[#27AE60]/50',
        textClassName: 'text-[#27AE60]',
        accentColor: '#27AE60',
      };
    case 'media':
      return {
        label,
        badgeClassName: 'bg-[#3498DB]/20 text-[#5DADE2] border-[#3498DB]/50',
        textClassName: 'text-[#5DADE2]',
        accentColor: '#5DADE2',
      };
    default:
      return {
        label,
        badgeClassName: 'bg-[#4A5570]/40 text-[#8B9BB4] border-[#4A5570]',
        textClassName: 'text-[#8B9BB4]',
        accentColor: '#8B9BB4',
      };
  }
}

export function synergyAccentColor(affinity: number): string {
  if (affinity >= 90) return '#2ECC71';
  if (affinity >= 75) return '#27AE60';
  if (affinity >= 50) return '#5DADE2';
  return '#8B9BB4';
}

/** @deprecated Usar synergyUiStyle para badge + texto coherentes. */
export function synergyBadgeStyle(affinity: number): { label: string; className: string } {
  let tier: SynergyTier = 'baja';
  if (affinity >= 90) tier = 'firma';
  else if (affinity >= 75) tier = 'alta';
  else if (affinity >= 50) tier = 'media';
  const ui = synergyUiStyle({
    affinity,
    tier,
    isSignature: affinity >= 90,
    label: `${affinity}%`,
    multiplier: 1,
    initiativeBonus: 0,
    mitigationBonus: 0,
  });
  return { label: ui.label, className: ui.badgeClassName };
}

export function synergyForMember(member: RosterMember | null | undefined, defId: string): SynergyResult | null {
  if (!member) return null;
  const def = CHAMPIONS.find(c => c.id === defId);
  if (!def) return null;
  const profile = resolvePlayerProfile(member.name, member.role, {
    mechanics: member.mechanics,
    macro: member.macro,
    styles: member.styles,
    signatureChampionIds: member.signatureChampionIds,
  });
  return computeSynergy(profile, def);
}

export function bindRosterToChampIds(
  champIds: string[],
  roster: RosterMember[],
): Array<{ defId: string; member: RosterMember | null }> {
  const byRole = new Map<Role, RosterMember>();
  for (const m of roster) {
    if (!byRole.has(m.role)) byRole.set(m.role, m);
  }
  return champIds.map(defId => {
    const def = CHAMPIONS.find(c => c.id === defId);
    const member = def ? byRole.get(def.role) || null : null;
    return { defId, member };
  });
}

export function defaultNeutralProfile(role: Role): PlayerCombatProfile {
  return {
    name: 'Jugador',
    role,
    mechanics: 75,
    macro: 75,
    styles: ROLE_DEFAULTS[role].styles,
    signatureChampionIds: [],
  };
}

export function initiativeFromAffinity(affinity: number | undefined): number {
  if (affinity == null) return 0;
  return Math.round(((affinity - 50) / 50) * 15);
}

export function mitigationFromAffinity(affinity: number | undefined): number {
  if (affinity == null) return 0;
  return clamp(((affinity - 50) / 50) * 0.08, 0, 0.08);
}
