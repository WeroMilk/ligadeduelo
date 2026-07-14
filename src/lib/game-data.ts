import type { ChampionDef, ItemDef, Role, Stats } from '@/types/game';

// ========== COLORES POR ROL ==========
export const ROLE_COLORS: Record<Role, string> = {
  top: '#C0392B',
  jungle: '#27AE60',
  mid: '#8E44AD',
  adc: '#E67E22',
  support: '#3498DB',
};

export const ROLE_NAMES: Record<Role, string> = {
  top: 'Top',
  jungle: 'Jungla',
  mid: 'Mid',
  adc: 'ADC',
  support: 'Support',
};

/** Crea stats con vida/maná llenos a partir de los valores base. */
export function makeStats(partial: Omit<Stats, 'hp' | 'mana'> & Partial<Pick<Stats, 'hp' | 'mana'>>): Stats {
  return {
    maxHp: partial.maxHp,
    maxMana: partial.maxMana,
    ad: partial.ad,
    ap: partial.ap,
    attackSpeed: partial.attackSpeed,
    armor: partial.armor,
    mr: partial.mr,
    moveSpeed: partial.moveSpeed,
    hp: partial.hp ?? partial.maxHp,
    mana: partial.mana ?? partial.maxMana,
  };
}

// ========== STATS BASE (fallback) ==========
export const BASE_STATS: Stats = makeStats({
  maxHp: 800,
  maxMana: 300,
  ad: 60,
  ap: 0,
  attackSpeed: 0.8,
  armor: 30,
  mr: 30,
  moveSpeed: 100,
});

// ========== 20 CAMPEONES ==========
export const CHAMPIONS: ChampionDef[] = [
  {
    id: 'darius', name: 'Darius', role: 'top', image: '/champions/darius.png', color: '#8B0000', initials: 'DA',
    baseStats: makeStats({ maxHp: 980, maxMana: 220, ad: 78, ap: 0, attackSpeed: 0.75, armor: 42, mr: 32, moveSpeed: 95 }),
    passive: { id: 'execute', name: 'Guillotina', description: 'Ejecuta enemigos bajo 20% de vida' },
  },
  {
    id: 'garen', name: 'Garen', role: 'top', image: '/champions/garen.png', color: '#2E5C3F', initials: 'GA',
    baseStats: makeStats({ maxHp: 1020, maxMana: 0, ad: 72, ap: 0, attackSpeed: 0.72, armor: 48, mr: 38, moveSpeed: 98 }),
    passive: { id: 'regen', name: 'Perseverancia', description: 'Regenera 3% vida máxima por turno' },
  },
  {
    id: 'malphite', name: 'Malphite', role: 'top', image: '/champions/malphite.png', color: '#5B6B7F', initials: 'MA',
    baseStats: makeStats({ maxHp: 1100, maxMana: 280, ad: 58, ap: 20, attackSpeed: 0.65, armor: 55, mr: 40, moveSpeed: 90 }),
    passive: { id: 'fortify', name: 'Granito', description: '+25% daño a torretas' },
  },
  {
    id: 'shen', name: 'Shen', role: 'top', image: '/champions/shen.png', color: '#2A4D7A', initials: 'SH',
    baseStats: makeStats({ maxHp: 940, maxMana: 340, ad: 64, ap: 10, attackSpeed: 0.7, armor: 50, mr: 45, moveSpeed: 96 }),
    passive: { id: 'guard', name: 'Ki Barrier', description: 'Cura al aliado más herido cada turno' },
  },
  {
    id: 'lee_sin', name: 'Lee Sin', role: 'jungle', image: '/champions/lee_sin.png', color: '#1B7A3D', initials: 'LS',
    baseStats: makeStats({ maxHp: 860, maxMana: 200, ad: 74, ap: 0, attackSpeed: 0.9, armor: 36, mr: 32, moveSpeed: 112 }),
    passive: { id: 'flurry', name: 'Flurry', description: '+15% daño tras saltar de línea' },
  },
  {
    id: 'amumu', name: 'Amumu', role: 'jungle', image: '/champions/amumu.png', color: '#4A6741', initials: 'AM',
    baseStats: makeStats({ maxHp: 920, maxMana: 310, ad: 55, ap: 35, attackSpeed: 0.68, armor: 44, mr: 42, moveSpeed: 94 }),
    passive: { id: 'tears', name: 'Lágrimas Cursadas', description: 'Al matar, daña a enemigos cercanos' },
  },
  {
    id: 'kayn', name: 'Kayn', role: 'jungle', image: '/champions/kayn.png', color: '#6B1FA6', initials: 'KA',
    baseStats: makeStats({ maxHp: 840, maxMana: 260, ad: 76, ap: 0, attackSpeed: 0.88, armor: 34, mr: 30, moveSpeed: 110 }),
    passive: { id: 'shadow', name: 'Hoz Umbral', description: 'Ignora 25% de armadura' },
  },
  {
    id: 'vi', name: 'Vi', role: 'jungle', image: '/champions/vi.png', color: '#C44BC4', initials: 'VI',
    baseStats: makeStats({ maxHp: 900, maxMana: 250, ad: 80, ap: 0, attackSpeed: 0.82, armor: 40, mr: 32, moveSpeed: 105 }),
    passive: { id: 'blast', name: 'Denting Blows', description: '+30% daño a estructuras' },
  },
  {
    id: 'ahri', name: 'Ahri', role: 'mid', image: '/champions/ahri.png', color: '#9B59B6', initials: 'AH',
    baseStats: makeStats({ maxHp: 760, maxMana: 420, ad: 52, ap: 68, attackSpeed: 0.78, armor: 28, mr: 34, moveSpeed: 104 }),
    passive: { id: 'essence', name: 'Robo de Esencia', description: 'Roba 25 maná al golpear' },
  },
  {
    id: 'lux', name: 'Lux', role: 'mid', image: '/champions/lux.png', color: '#F1C40F', initials: 'LU',
    baseStats: makeStats({ maxHp: 720, maxMana: 480, ad: 48, ap: 78, attackSpeed: 0.7, armor: 24, mr: 32, moveSpeed: 100 }),
    passive: { id: 'illumination', name: 'Iluminación', description: 'Habilidades hacen +40% AP extra (25%)' },
  },
  {
    id: 'zed', name: 'Zed', role: 'mid', image: '/champions/zed.png', color: '#2C3E50', initials: 'ZE',
    baseStats: makeStats({ maxHp: 780, maxMana: 180, ad: 82, ap: 0, attackSpeed: 0.95, armor: 30, mr: 28, moveSpeed: 115 }),
    passive: { id: 'contempt', name: 'Desprecio', description: '+12 AD permanente tras cada kill' },
  },
  {
    id: 'yasuo', name: 'Yasuo', role: 'mid', image: '/champions/yasuo.png', color: '#7F8C8D', initials: 'YA',
    baseStats: makeStats({ maxHp: 800, maxMana: 100, ad: 70, ap: 0, attackSpeed: 1.05, armor: 32, mr: 30, moveSpeed: 108 }),
    passive: { id: 'flow', name: 'Resolución', description: '+0.3 AS por 2 turnos tras un kill' },
  },
  {
    id: 'caitlyn', name: 'Caitlyn', role: 'adc', image: '/champions/caitlyn.png', color: '#2980B9', initials: 'CA',
    baseStats: makeStats({ maxHp: 740, maxMana: 300, ad: 72, ap: 0, attackSpeed: 1.0, armor: 26, mr: 26, moveSpeed: 102 }),
    passive: { id: 'headshot', name: 'Headshot', description: '25% de críticos ×1.6 daño' },
  },
  {
    id: 'jinx', name: 'Jinx', role: 'adc', image: '/champions/jinx.png', color: '#E91E63', initials: 'JI',
    baseStats: makeStats({ maxHp: 730, maxMana: 280, ad: 68, ap: 0, attackSpeed: 1.12, armor: 24, mr: 26, moveSpeed: 100 }),
    passive: { id: 'getexcited', name: 'Get Excited!', description: '+0.15 AS por cada kill' },
  },
  {
    id: 'ezreal', name: 'Ezreal', role: 'adc', image: '/champions/ezreal.png', color: '#00BCD4', initials: 'EZ',
    baseStats: makeStats({ maxHp: 750, maxMana: 380, ad: 66, ap: 25, attackSpeed: 0.95, armor: 26, mr: 28, moveSpeed: 106 }),
    passive: { id: 'rising', name: 'Spellblade', description: 'Ataques gastan 20 maná y hacen +AP' },
  },
  {
    id: 'kaisa', name: "Kai'Sa", role: 'adc', image: '/champions/kaisa.png', color: '#673AB7', initials: 'KS',
    baseStats: makeStats({ maxHp: 760, maxMana: 340, ad: 70, ap: 30, attackSpeed: 1.08, armor: 28, mr: 28, moveSpeed: 108 }),
    passive: { id: 'evolve', name: 'Segundo Skin', description: 'Tras 2 kills: +10 AD y +15 AP' },
  },
  {
    id: 'leona', name: 'Leona', role: 'support', image: '/champions/leona.png', color: '#FF9800', initials: 'LE',
    baseStats: makeStats({ maxHp: 1000, maxMana: 300, ad: 58, ap: 15, attackSpeed: 0.68, armor: 52, mr: 42, moveSpeed: 96 }),
    passive: { id: 'sunlight', name: 'Soleares', description: 'Ataques aliados cercanos +12 daño' },
  },
  {
    id: 'thresh', name: 'Thresh', role: 'support', image: '/champions/thresh.png', color: '#1A6B3E', initials: 'TH',
    baseStats: makeStats({ maxHp: 880, maxMana: 360, ad: 54, ap: 40, attackSpeed: 0.7, armor: 38, mr: 36, moveSpeed: 98 }),
    passive: { id: 'hook', name: 'Sentencia', description: 'Acerca al enemigo y reduce su armadura' },
  },
  {
    id: 'lulu', name: 'Lulu', role: 'support', image: '/champions/lulu.png', color: '#E040FB', initials: 'LL',
    baseStats: makeStats({ maxHp: 700, maxMana: 450, ad: 42, ap: 62, attackSpeed: 0.72, armor: 22, mr: 34, moveSpeed: 100 }),
    passive: { id: 'pix', name: 'Pix', description: 'Aliado con menos vida recibe +escudo AP' },
  },
  {
    id: 'soraka', name: 'Soraka', role: 'support', image: '/champions/soraka.png', color: '#00E676', initials: 'SO',
    baseStats: makeStats({ maxHp: 720, maxMana: 500, ad: 40, ap: 70, attackSpeed: 0.65, armor: 22, mr: 36, moveSpeed: 98 }),
    passive: { id: 'salvation', name: 'Salvación', description: 'Cura 40 + 20% AP al aliado más herido' },
  },
];

export const RIVAL_TEAM_ID = 'rival_shadow';
export const RIVAL_TEAM_NAME = 'La Sombra Eterna';

export function getChampionBaseStats(defId: string): Stats {
  const def = CHAMPIONS.find(c => c.id === defId);
  return def ? { ...def.baseStats } : { ...BASE_STATS };
}

// ========== 8 ÍTEMS (efectos de mesa) ==========
export const ITEMS: ItemDef[] = [
  {
    id: 'long_sword',
    name: 'Espada Larga',
    image: '/items/long_sword.png',
    statBonus: { ad: 15 },
    description: '+15 AD · Al Atacar: +35 daño físico',
  },
  {
    id: 'blasting_wand',
    name: 'Vara Explosiva',
    image: '/items/blasting_wand.png',
    statBonus: { ap: 15 },
    description: '+15 AP · Al usar Habilidad: +45 daño mágico',
  },
  {
    id: 'dagger',
    name: 'Daga',
    image: '/items/dagger.png',
    statBonus: { attackSpeed: 0.15 },
    description: 'Prioridad +1 (actúas primero en empates)',
  },
  {
    id: 'boots',
    name: 'Botas',
    image: '/items/boots.png',
    statBonus: { moveSpeed: 15 },
    description: 'Puedes rotar de línea al planificar (emboscada)',
  },
  {
    id: 'cloth_armor',
    name: 'Capa de Fuego',
    image: '/items/cloth_armor.png',
    statBonus: { armor: 15 },
    description: '+15 Arm · Tras Atacar: quema 25 al inicio de la siguiente',
  },
  {
    id: 'null_magic',
    name: 'Manto de Anulación',
    image: '/items/null_magic.png',
    statBonus: { mr: 15 },
    description: '+15 MR · Reduce Habilidad enemiga en −40',
  },
  {
    id: 'ruby_crystal',
    name: 'Cristal de Rubí',
    image: '/items/ruby_crystal.png',
    statBonus: { maxHp: 120 },
    description: '+120 Vida máxima',
  },
  {
    id: 'tear',
    name: 'Lágrima de la Diosa',
    image: '/items/tear.png',
    statBonus: { maxMana: 100 },
    description: 'Cargas de Habilidad: a 5, la siguiente hace ×2',
  },
];

export const MAX_MATCH_ROUNDS = 10;
export const GOLD_PER_ROUND = 80;
export const GOLD_PER_KILL = 100;
export const POINTS_KILL = 2;
export const POINTS_TOWER = 3;
export const POINTS_OBJECTIVE = 5;

// ========== NOMBRES DE EQUIPOS IA ==========
export const AI_TEAM_NAMES = [
  'Shadow Legion',
  'Storm Bringers',
  'Void Walkers',
  'Iron Wolves',
  'Phoenix Rising',
  'Dark Knights',
  'Crimson Tide',
  'Eternal Flames',
  'Frost Guardians',
  'Thunder Strikers',
  'Night Raiders',
  'Soul Reapers',
  'Blaze Squad',
  'Mystic Force',
  'Venom Squad',
];

// ========== PRIORIDAD DE ÍTEMS POR ROL (IA) ==========
export const ITEM_PRIORITY_BY_ROLE: Record<Role, string[]> = {
  top: ['ruby_crystal', 'cloth_armor', 'boots', 'long_sword', 'null_magic', 'tear', 'dagger', 'blasting_wand'],
  jungle: ['long_sword', 'boots', 'dagger', 'ruby_crystal', 'cloth_armor', 'tear', 'null_magic', 'blasting_wand'],
  mid: ['blasting_wand', 'tear', 'boots', 'ruby_crystal', 'null_magic', 'long_sword', 'dagger', 'cloth_armor'],
  adc: ['long_sword', 'dagger', 'boots', 'ruby_crystal', 'cloth_armor', 'tear', 'null_magic', 'blasting_wand'],
  support: ['tear', 'null_magic', 'ruby_crystal', 'boots', 'cloth_armor', 'blasting_wand', 'long_sword', 'dagger'],
};
