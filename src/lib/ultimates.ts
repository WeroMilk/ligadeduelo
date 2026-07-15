import type { ChampionUltimate } from '@/types/game';

/** Ultimates 1 vez por partida (clave = championId). */
export const ULTIMATES: Record<string, ChampionUltimate> = {
  darius: { id: 'noxian', name: 'Noxian Guillotine', description: 'Si haces un kill esta ronda, recuperas 80 de vida' },
  garen: { id: 'justice', name: 'Demacian Justice', description: 'Tu Atacar ignora 25% de la armadura enemiga' },
  malphite: { id: 'unstoppable', name: 'Unstoppable Force', description: 'Tu Defender anula todo el daño esta ronda' },
  shen: { id: 'stand', name: 'Stand United', description: 'El aliado más herido recibe Defender gratis' },
  aatrox: { id: 'worldender', name: 'World Ender', description: 'Tu Atacar hace +55 daño' },
  sett: { id: 'haymaker', name: 'The Show Stopper', description: 'Tu Atacar hace +50 daño' },
  lee_sin: { id: 'dragonkick', name: 'Dragon\'s Rage', description: 'En la pelea que ayudas: +40 daño físico' },
  amumu: { id: 'curse', name: 'Curse of the Sad Mummy', description: 'Los rivales en tu pelea no pueden Defender' },
  kayn: { id: 'umbral', name: 'Umbral Trespass', description: 'Si Atacas, siempre actúas primero' },
  vi: { id: 'assault', name: 'Assault and Battery', description: 'Tu Atacar hace +50 daño' },
  graves: { id: 'collateral', name: 'Collateral Damage', description: 'Tu Atacar hace +45 daño' },
  sejuani: { id: 'glacial', name: 'Glacial Prison', description: 'Los rivales en tu pelea no pueden Defender' },
  ahri: { id: 'charm', name: 'Encanto', description: 'Revela la acción del mid enemigo antes de confirmar' },
  lux: { id: 'spark', name: 'Final Spark', description: 'Tu Habilidad hace +50% daño' },
  zed: { id: 'deathmark', name: 'Death Mark', description: 'Tu víctima recibe +30 daño al cerrar la pelea' },
  yasuo: { id: 'lastbreath', name: 'Last Breath', description: 'Si Atacas, golpeas una segunda vez al 60%' },
  syndra: { id: 'unleashed', name: 'Unleashed Power', description: 'Tu Habilidad hace +50% daño' },
  orianna: { id: 'shockwave', name: 'Command: Shockwave', description: 'Tu Habilidad hace +40 daño extra' },
  caitlyn: { id: 'ace', name: 'Ace in the Hole', description: 'Tu Atacar ignora el Defender rival' },
  jinx: { id: 'rocket', name: 'Super Mega Death Rocket!', description: 'Habilidad: +15 daño por cada kill tuya' },
  ezreal: { id: 'trueshot', name: 'Trueshot Barrage', description: 'Habilidad: +35 daño extra' },
  kaisa: { id: 'instinct', name: 'Killer Instinct', description: 'Si el rival está bajo 35% HP, Atacar ejecuta' },
  ashe: { id: 'arrow', name: 'Enchanted Crystal Arrow', description: 'Tu Atacar ignora el Defender rival' },
  jhin: { id: 'curtain', name: 'Curtain Call', description: 'Si el rival está bajo 35% HP, Atacar ejecuta' },
  leona: { id: 'solar', name: 'Solar Flare', description: 'El rival de bot no puede Atacar (se vuelve Defender)' },
  thresh: { id: 'box', name: 'The Box', description: 'El rival en tu pelea pierde 20 de armadura' },
  lulu: { id: 'wild', name: 'Wild Growth', description: 'Aliado más herido gana +120 HP esta ronda' },
  soraka: { id: 'wish', name: 'Wish', description: 'Cura 100 de vida a todo el equipo' },
  nautilus: { id: 'depth', name: 'Depth Charge', description: 'El rival en tu pelea pierde 20 de armadura' },
  yuumi: { id: 'finalchapter', name: 'Final Chapter', description: 'Aliado más herido gana +120 HP esta ronda' },
};

export function getUltimate(champId: string): ChampionUltimate {
  return ULTIMATES[champId] || {
    id: 'generic',
    name: 'Descarga',
    description: 'Tu acción principal hace +25 daño esta ronda',
  };
}
