import type { ChampionUltimate } from '@/types/game';

/** Definitivas con cooldown de 3 turnos (clave = championId). */
export const ULTIMATES: Record<string, ChampionUltimate> = {
  darius: { id: 'noxian_guillotine', name: 'Guillotina noxiana', description: 'Si matas, recuperas 80 HP y ganas +15 AD esta ronda' },
  garen: { id: 'demacian_justice', name: 'Justicia demaciana', description: 'Atacar inflige al menos 12% de la vida máxima rival' },
  malphite: { id: 'unstoppable_force', name: 'Fuerza imparable', description: 'Actúas primero y tu Defender anula el primer golpe' },
  shen: { id: 'stand_united', name: 'Unidos Permaneceremos', description: 'El aliado más herido gana +40 HP y Defiende' },
  aatrox: { id: 'world_ender', name: 'Aniquilador de mundos', description: 'Atacar +40 y cura el 30% del daño infligido' },
  sett: { id: 'the_show_stopper', name: 'El golpe espectacular', description: 'Atacar añade 8% de tu vida máxima como daño' },
  lee_sin: { id: 'dragons_rage', name: 'Furia del dragón', description: 'Actúas primero y haces +50 daño' },
  amumu: { id: 'curse_of_the_sad_mummy', name: 'Maldición de la momia triste', description: 'Todos los rivales de la línea no pueden Defender' },
  kayn: { id: 'umbral_trespass', name: 'Traspaso umbral', description: 'Si Atacas: primero, +25 daño e ignoras Defender' },
  vi: { id: 'assault_and_battery', name: 'Asalto y agresión', description: 'Atacar +35 e impide la primera defensa rival' },
  graves: { id: 'collateral_damage', name: 'Daño colateral', description: 'Atacar +30 y salpica +20 a otro rival de la línea' },
  sejuani: { id: 'glacial_prison', name: 'Prisión glacial', description: 'El rival pierde su primera acción ofensiva' },
  ahri: { id: 'spirit_rush', name: 'Espíritu salvaje', description: 'Tres embates mágicos (+18 cada uno) y te curas 40' },
  lux: { id: 'final_spark', name: 'Chispa final', description: 'Habilidad ×1.6 e ignora Defender' },
  zed: { id: 'death_mark', name: 'Marca mortal', description: 'Al cerrar la pelea: +40 daño; si mata, +20 AD permanente' },
  yasuo: { id: 'last_breath', name: 'Último aliento', description: 'Atacar: segundo golpe al 70% y máxima prioridad' },
  syndra: { id: 'unleashed_power', name: 'Poder desatado', description: 'Habilidad +60 daño plano' },
  orianna: { id: 'command_shockwave', name: 'Orden: Onda de choque', description: 'Habilidad +30 y −10 armadura a rivales de la línea' },
  caitlyn: { id: 'ace_in_the_hole', name: 'As en la manga', description: 'Atacar ignora Defender y +25 si el rival está bajo 50% HP' },
  jinx: { id: 'super_mega_death_rocket', name: 'Súper mega cohete mortal', description: 'Habilidad +20 daño por cada baja tuya (mín. +20)' },
  ezreal: { id: 'trueshot_barrage', name: 'Descarga certera', description: 'Habilidad +45 y +15 por aliado vivo en la línea' },
  kaisa: { id: 'killer_instinct', name: 'Instinto asesino', description: 'Si el rival está bajo 40% HP, Atacar ejecuta; si no, +30' },
  ashe: { id: 'enchanted_crystal_arrow', name: 'Flecha de cristal encantada', description: 'Atacar ignora Defender y el rival actúa último' },
  jhin: { id: 'curtain_call', name: 'Llamado a escena', description: 'Cuatro impactos (25% cada uno) o ejecución bajo 30% HP' },
  leona: { id: 'solar_flare', name: 'Llamarada solar', description: 'El rival Defiende y tu ADC aliado gana +20 daño' },
  thresh: { id: 'the_box', name: 'La caja', description: 'Rival −25 armadura; si Ataca, su daño cae 15' },
  lulu: { id: 'wild_growth', name: 'Crecimiento desenfrenado', description: 'Aliado más herido +100 HP y Defiende' },
  soraka: { id: 'wish', name: 'Deseo', description: 'Equipo +80 HP; el más herido +40 extra' },
  nautilus: { id: 'depth_charge', name: 'Carga de profundidad', description: 'El rival Defiende y pierde 15 de armadura' },
  yuumi: { id: 'final_chapter', name: 'Capítulo final', description: 'Tu ADC aliado +80 HP y +25 daño esta ronda' },
};

export function getUltimate(champId: string): ChampionUltimate {
  return ULTIMATES[champId] || {
    id: 'generic',
    name: 'Descarga',
    description: 'Tu acción hace +25 daño',
  };
}
