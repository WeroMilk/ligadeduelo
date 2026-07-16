import type { ChampionUltimate } from '@/types/game';

/** Ultimates 1 vez por partida (clave = championId). */
export const ULTIMATES: Record<string, ChampionUltimate> = {
  darius: { id: 'noxian', name: 'Guillotina noxiana', description: 'Si haces una baja esta ronda, recuperas 80 de vida' },
  garen: { id: 'justice', name: 'Justicia demaciana', description: 'Tu Atacar ignora 25% de la armadura enemiga' },
  malphite: { id: 'unstoppable', name: 'Fuerza imparable', description: 'Tu Defender anula todo el daño esta ronda' },
  shen: { id: 'stand', name: 'Unidos Permaneceremos', description: 'El aliado más herido recibe Defender gratis' },
  aatrox: { id: 'worldender', name: 'Aniquilador de mundos', description: 'Tu Atacar hace +55 daño' },
  sett: { id: 'haymaker', name: 'El golpe espectacular', description: 'Tu Atacar hace +50 daño' },
  lee_sin: { id: 'dragonkick', name: 'Furia del dragón', description: 'En la pelea que ayudas: +40 daño físico' },
  amumu: { id: 'curse', name: 'Maldición de la momia triste', description: 'Los rivales en tu pelea no pueden Defender' },
  kayn: { id: 'umbral', name: 'Traspaso umbral', description: 'Si Atacas, siempre actúas primero' },
  vi: { id: 'assault', name: 'Asalto y agresión', description: 'Tu Atacar hace +50 daño' },
  graves: { id: 'collateral', name: 'Daño colateral', description: 'Tu Atacar hace +45 daño' },
  sejuani: { id: 'glacial', name: 'Prisión glacial', description: 'Los rivales en tu pelea no pueden Defender' },
  ahri: { id: 'charm', name: 'Encanto', description: 'Revela la acción del central enemigo antes de confirmar' },
  lux: { id: 'spark', name: 'Chispa final', description: 'Tu Habilidad hace +50% daño' },
  zed: { id: 'deathmark', name: 'Marca mortal', description: 'Tu víctima recibe +30 daño al cerrar la pelea' },
  yasuo: { id: 'lastbreath', name: 'Último aliento', description: 'Si Atacas, golpeas una segunda vez al 60%' },
  syndra: { id: 'unleashed', name: 'Poder desatado', description: 'Tu Habilidad hace +50% daño' },
  orianna: { id: 'shockwave', name: 'Orden: Onda de choque', description: 'Tu Habilidad hace +40 daño extra' },
  caitlyn: { id: 'ace', name: 'As en la manga', description: 'Tu Atacar ignora el Defender rival' },
  jinx: { id: 'rocket', name: 'Súper mega cohete mortal', description: 'Habilidad: +15 daño por cada baja tuya' },
  ezreal: { id: 'trueshot', name: 'Descarga certera', description: 'Habilidad: +35 daño extra' },
  kaisa: { id: 'instinct', name: 'Instinto asesino', description: 'Si el rival está bajo 35% de vida, Atacar ejecuta' },
  ashe: { id: 'arrow', name: 'Flecha de cristal encantada', description: 'Tu Atacar ignora el Defender rival' },
  jhin: { id: 'curtain', name: 'Llamado a escena', description: 'Si el rival está bajo 35% de vida, Atacar ejecuta' },
  leona: { id: 'solar', name: 'Llamarada solar', description: 'El rival de inferior no puede Atacar (se vuelve Defender)' },
  thresh: { id: 'box', name: 'La caja', description: 'El rival en tu pelea pierde 20 de armadura' },
  lulu: { id: 'wild', name: 'Crecimiento desenfrenado', description: 'Aliado más herido gana +120 de vida esta ronda' },
  soraka: { id: 'wish', name: 'Deseo', description: 'Cura 100 de vida a todo el equipo' },
  nautilus: { id: 'depth', name: 'Carga de profundidad', description: 'El rival en tu pelea pierde 20 de armadura' },
  yuumi: { id: 'finalchapter', name: 'Capítulo final', description: 'Aliado más herido gana +120 de vida esta ronda' },
};

export function getUltimate(champId: string): ChampionUltimate {
  return ULTIMATES[champId] || {
    id: 'generic',
    name: 'Descarga',
    description: 'Tu acción hace +25 daño',
  };
}
