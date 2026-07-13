import type { ChampionDef, ItemDef, Role } from '@/types/game';

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

// ========== STATS BASE ==========
export const BASE_STATS = {
  hp: 800,
  maxHp: 800,
  mana: 300,
  maxMana: 300,
  ad: 60,
  ap: 0,
  attackSpeed: 0.8,
  armor: 30,
  mr: 30,
  moveSpeed: 100,
};

// ========== 20 CAMPEONES ==========
export const CHAMPIONS: ChampionDef[] = [
  // Top (4)
  { id: 'darius', name: 'Darius', role: 'top', image: '/champions/darius.png', color: '#8B0000', initials: 'DA' },
  { id: 'garen', name: 'Garen', role: 'top', image: '/champions/garen.png', color: '#2E5C3F', initials: 'GA' },
  { id: 'malphite', name: 'Malphite', role: 'top', image: '/champions/malphite.png', color: '#5B6B7F', initials: 'MA' },
  { id: 'shen', name: 'Shen', role: 'top', image: '/champions/shen.png', color: '#2A4D7A', initials: 'SH' },
  // Jungle (4)
  { id: 'lee_sin', name: 'Lee Sin', role: 'jungle', image: '/champions/lee_sin.png', color: '#1B7A3D', initials: 'LS' },
  { id: 'amumu', name: 'Amumu', role: 'jungle', image: '/champions/amumu.png', color: '#4A6741', initials: 'AM' },
  { id: 'kayn', name: 'Kayn', role: 'jungle', image: '/champions/kayn.png', color: '#6B1FA6', initials: 'KA' },
  { id: 'vi', name: 'Vi', role: 'jungle', image: '/champions/vi.png', color: '#C44BC4', initials: 'VI' },
  // Mid (4)
  { id: 'ahri', name: 'Ahri', role: 'mid', image: '/champions/ahri.png', color: '#9B59B6', initials: 'AH' },
  { id: 'lux', name: 'Lux', role: 'mid', image: '/champions/lux.png', color: '#F1C40F', initials: 'LU' },
  { id: 'zed', name: 'Zed', role: 'mid', image: '/champions/zed.png', color: '#2C3E50', initials: 'ZE' },
  { id: 'yasuo', name: 'Yasuo', role: 'mid', image: '/champions/yasuo.png', color: '#7F8C8D', initials: 'YA' },
  // ADC (4)
  { id: 'caitlyn', name: 'Caitlyn', role: 'adc', image: '/champions/caitlyn.png', color: '#2980B9', initials: 'CA' },
  { id: 'jinx', name: 'Jinx', role: 'adc', image: '/champions/jinx.png', color: '#E91E63', initials: 'JI' },
  { id: 'ezreal', name: 'Ezreal', role: 'adc', image: '/champions/ezreal.png', color: '#00BCD4', initials: 'EZ' },
  { id: 'kaisa', name: "Kai'Sa", role: 'adc', image: '/champions/kaisa.png', color: '#673AB7', initials: 'KS' },
  // Support (4)
  { id: 'leona', name: 'Leona', role: 'support', image: '/champions/leona.png', color: '#FF9800', initials: 'LE' },
  { id: 'thresh', name: 'Thresh', role: 'support', image: '/champions/thresh.png', color: '#1A6B3E', initials: 'TH' },
  { id: 'lulu', name: 'Lulu', role: 'support', image: '/champions/lulu.png', color: '#E040FB', initials: 'LL' },
  { id: 'soraka', name: 'Soraka', role: 'support', image: '/champions/soraka.png', color: '#00E676', initials: 'SO' },
];

// ========== 8 ÍTEMS ==========
export const ITEMS: ItemDef[] = [
  {
    id: 'long_sword',
    name: 'Espada Larga',
    image: '/items/long_sword.png',
    statBonus: { ad: 25 },
    description: '+25 AD',
  },
  {
    id: 'blasting_wand',
    name: 'Vara Explosiva',
    image: '/items/blasting_wand.png',
    statBonus: { ap: 25 },
    description: '+25 AP',
  },
  {
    id: 'dagger',
    name: 'Daga',
    image: '/items/dagger.png',
    statBonus: { attackSpeed: 0.2 },
    description: '+0.2 Vel. Ataque',
  },
  {
    id: 'boots',
    name: 'Botas',
    image: '/items/boots.png',
    statBonus: { moveSpeed: 20 },
    description: '+20% Vel. Movimiento',
  },
  {
    id: 'cloth_armor',
    name: 'Capa de Fuego',
    image: '/items/cloth_armor.png',
    statBonus: { armor: 20 },
    description: '+20 Armadura',
  },
  {
    id: 'null_magic',
    name: 'Manto de Anulación',
    image: '/items/null_magic.png',
    statBonus: { mr: 20 },
    description: '+20 Resistencia Mágica',
  },
  {
    id: 'ruby_crystal',
    name: 'Cristal de Rubí',
    image: '/items/ruby_crystal.png',
    statBonus: { maxHp: 150 },
    description: '+150 Vida',
  },
  {
    id: 'tear',
    name: 'Lágrima de la Diosa',
    image: '/items/tear.png',
    statBonus: { maxMana: 150 },
    description: '+150 Maná',
  },
];

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
