import type { Role, RosterMember } from '@/types/game';
import { fanOrgDisplayName, type FanOrg } from '@/lib/game-data';

const ROLES: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];

/** Pools amplios por región para evitar nicks repetidos entre orgs. */
const NICKS: Record<string, Partial<Record<Role, string[]>>> = {
  LEC: {
    top: ['Wunder', 'BrokenBlade', 'Odoamne', 'Adam', 'Canna', 'Irrelevant', 'Chasy', 'Oscarinin', 'FnaticTOP', 'Vizicsacsi', 'Alphari', 'Jwoles', 'Kikis', 'WhiteKnight', 'Finn', 'Jenax', 'Markoon', 'Photon', 'CrownieT', 'Szygenda', 'JNX', 'Tracyn', 'Vertigo', 'Nerroh', 'Cabochard', 'SoHwan', 'Armut', 'HiRit'],
    jungle: ['Jankos', 'Razork', 'Yike', 'Elyoya', 'Sheo', 'Xerxe', 'Selfmade', 'Bo', 'Julien', 'InspiredEU', 'Sprout', 'Zanzarah', 'Trick', 'Kirei', 'Broxah', 'Amazing', 'Svenskeren', 'Maxlore', 'Memento', 'Shlatan', 'MarkoonJ', 'Cinkrof', 'CloserEU', 'PeanutEU', 'Malrang', 'Djoko', 'Kirei2', 'Gilius'],
    mid: ['Caps', 'Humanoid', 'Larssen', 'Vetheo', 'Nuc', 'Perkz', 'Nemesis', 'Abbedagge', 'MagiFelix', 'Febiven', 'Sencux', 'Jiizuke', 'Exile', 'Blue', 'Ruby', 'Sertuss', 'KrepoM', 'Relative', 'JackspektraM', 'Czajek', 'Comp', 'Simsy', 'Nomanz', 'Backlund', 'Furuy', 'KyneticM', 'Scarface', 'TynX'],
    adc: ['Rekkles', 'Upset', 'Hans Sama', 'Ice', 'Caliste', 'Patrik', 'Carzzy', 'Neon', 'Kobbe', 'Attila', 'Crownie', 'Jezu', 'Flakked', 'Jackspektra', 'CompA', 'Bean', 'Innaxe', 'Woolite', 'P1noy', 'Steeelback', 'Hjarnan', 'FORG1VEN', 'Emperor', 'Tabzz', 'Candyfloss', 'xMatty', 'Deadly', 'Jopa'],
    support: ['Mikyx', 'Hylissang', 'Trymbi', 'Alvaro', 'Jun', 'Targamas', 'Kaiser', 'Limit', 'Vander', 'Dreams', 'Labrov', 'IgNar', 'Jesiz', 'KaSing', 'YellOwStaR', 'Krepo', 'promisq', 'Advienne', 'Lilipp', 'Zoelys', 'Seal', 'Denyk', 'Lucky', 'Raxxo', 'Tore', 'Nitro', 'Stasko', 'Woldjo'],
  },
  LCK: {
    top: ['Zeus', 'Kiin', 'Doran', 'Rascal', 'CuVee', 'Khan', 'Smeb', 'Huni', 'Duke', 'ImpactKR', 'Swipe', 'Rich', 'Clear', 'DnDn', 'PerfecT', 'Morgan', 'CannaKR', 'Dove', 'Roamer', 'Soboro', 'Castle', 'DDoiV', 'Kingen', 'Summit', 'Flame', 'SsumdayKR', 'Untara', 'Thanatos'],
    jungle: ['Oner', 'Canyon', 'Peanut', 'Clid', 'Blank', 'Score', 'Spirit', 'Bengi', 'Ambition', 'Cuzz', 'UmTi', 'Pyosik', 'Willer', 'Duro', 'Lucid', 'Sylas', 'Ellim', 'Bonnie', 'Forest', 'Juhan', 'YoungJae', 'OnFleek', 'Tarzan', 'Dread', 'Seize', 'Raptor', 'HamBak', 'GIDEON'],
    mid: ['Faker', 'Chovy', 'ShowMaker', 'Bdd', 'Crown', 'Pawn', 'Kuro', 'Easyhoon', 'Fly', 'Clozer', 'Zeka', 'Karis', 'VicLa', 'BuLLDoG', 'Fisher', 'Tempester', 'Mask', 'Lava', 'Solka', 'Kyeahoo', 'Quid', 'Poby', 'ScoutKR', 'Kuzan', 'Edge', 'DoveM', 'Cedar', 'Feisty'],
    adc: ['Gumayusi', 'Ruler', 'Viper', 'Deft', 'Pray', 'Bang', 'SmebA', 'Teddy', 'Ghost', 'Aiming', 'Hype', 'Bull', 'Envyy', 'Taeyoon', 'BersekerKR', 'SamD', 'Noah', 'HyBriD', 'Leo', 'Pleata', 'CaD', 'Trigger', 'Prince', 'KeriaA', 'Route', 'Mystic', 'Kramer', 'Stitch'],
    support: ['Keria', 'BeryL', 'Lehends', 'Wolf', 'Effort', 'Mata', 'Life', 'GorillA', 'Pure', 'Delight', 'Kael', 'Kellin', 'Asper', 'Hoit', 'Peter', 'Execute', 'Andil', 'Quantum', 'Mihile', 'Bini', 'Pollu', 'Way', 'Blessing', 'SnowFlower', 'IgnarKR', 'TusiN', 'Secret', 'Max'],
  },
  LPL: {
    top: ['Bin', '369', 'TheShy', 'Ale', 'Zoom', 'XiaohuT', 'Wayward', 'Shanji', 'Zika', 'Qingtian', 'Hoya', 'Xiaoxu', 'Breathe', 'Flandre', 'Langx', 'QingGang', 'XiaohaoT', 'Invincible', 'Alon', 'Cube', 'Biubiu', 'NaiYou', 'Sole', 'Xiaobai', 'Lies', 'Mouse', 'Kabe', 'Xiyang'],
    jungle: ['Xun', 'Jiejie', 'Wei', 'Karsa', 'Tian', 'Ning', 'Mlxg', 'Clearlove', 'XiaohuJ', 'Beichuan', 'Heng', 'TarzanCN', 'Aki', 'Xiaopeng', 'Xiaohao', 'JunJia', 'XiaoYan', 'HuanfengJ', 'Monki', 'NaiyouJ', 'Meteor', 'Leyan', 'Xx', 'Haro', 'SofM', 'Condi', 'Muge', 'Peng'],
    mid: ['Knight', 'Yagao', 'Rookie', 'xiaohu', 'Scout', 'Doinb', 'Xiye', 'Icon', 'GodV', 'Shanks', 'FoFo', 'Angel', 'Care', 'Cream', 'Qingyu', 'Cryin', 'Mole', 'Yuekai', 'Frigid', 'Milkyway', 'SmlzM', 'ForgeCN', 'ZekaCN', 'NuguriM', 'Twuff', 'Jay', 'Winky', 'Xiaofang'],
    adc: ['Elk', 'GALA', 'JackeyLove', 'Light', 'Imp', 'Uzi', 'Lwx', 'Hope', 'Photic', 'Doggo', 'Leave', 'Able', 'Betty', 'Assum', 'PpgodA', 'Hang', 'Eric', 'Baiye', 'JiaQi', 'Wako', 'Such', 'XiaoALi', 'IBoy', 'LokeN', 'King', 'Jinjiao', 'KramerCN', 'Puff'],
    support: ['ON', 'Meiko', 'Missing', 'Crisp', 'Ming', 'Baolan', 'LvMao', 'SwordArt', 'Zhuo', 'JinjiaoS', 'HangS', 'Mark', 'XinMo', 'Yuyanjia', 'Ke', 'Iwandy', 'QiuQiu', 'Southwind', 'Jwei', 'ShiauC', 'Ash', 'Xing', 'Corpse', 'Pyl', 'Filler', 'Yun', 'XinLiu', 'Zzr'],
  },
  LCS: {
    top: ['Impact', 'Bwipo', 'Licorice', 'Hauntzer', 'Ssumday', 'Solo', 'Dhokla', 'Fudge', 'Revenge', 'FakeGod', 'Tenacity', 'Rest', 'Lourlo', 'Dyrus', 'Balls', 'ZionSpartan', 'Quas', 'RF Legendary', 'Jenkins', 'Pheonix', 'Gamsu', 'V1per', 'Niles', 'Kumo', 'Ssumday2', 'Solo2', 'Dhokla2', 'Fudge2'],
    jungle: ['Blaber', 'Inspired', 'Spica', 'Xmithie', 'Contractz', 'Santorin', 'River', 'Closer', 'Kenvi', 'eXyu', 'Perry', 'Bugi', 'SvenskerenNA', 'Meteos', 'Reignover', 'Rush', 'Akaadian', 'Wiggily', 'Josedeodo', 'PyosikNA', 'OddOrange', 'Frostforest', 'Tomio', 'Yuuji', 'RoseThorn', 'Armao', 'Sheiden', 'Gryffinn'],
    mid: ['Jojopyun', 'APA', 'Jensen', 'Bjergsen', 'PowerOfEvil', 'Palafox', 'AbbedaggeNA', 'JimieN', 'Haeri', 'Quad', 'Gori', 'Fenix', 'Pobelter', 'HuhiM', 'Shiphtur', 'Goldenglue', 'Damonte', '5fire', 'Insanity', 'DoveNA', 'Copy', 'Torement', 'Solve', 'Young', 'eXyuM', 'CryoM', 'StixxayM', 'CodySunM'],
    adc: ['Berserker', 'Yeon', 'Doublelift', 'Zven', 'Sneaky', 'Tactical', 'FBI', 'Danny', 'Neo', 'PrinceNA', 'Massu', 'WildTurtle', 'Stixxay', 'Cody Sun', 'ArrowNA', 'Apollo', 'Keith', 'Piglet', 'Deftly', 'Johnsun', 'Instinct', 'Berserker2', 'Tomoya', 'WinsomeA', 'IslesA', 'Minui', 'Array', 'Luna'],
    support: ['CoreJJ', 'Busio', 'Vulcan', 'Biofrost', 'Smoothie', 'huhi', 'Eyla', 'IgNarNA', 'Winsome', 'Isles', 'Zeyzal', 'aphromoo', 'Olleh', 'Adrian', 'Hakuho', 'Fabbbyyy', 'Poome', 'Diamond', 'Chippys', 'Trevor', 'GoriS', 'SwordArtNA', 'JayJ', 'Nadeshot', 'Ablazeolive', 'Mist', 'Farret', 'Basso'],
  },
  default: {
    top: ['Alpha', 'Steel', 'Forge', 'Titan', 'Bolt', 'Rampart', 'Aegis', 'Vanguard', 'Bastion', 'Colossus', 'Ironclad', 'Bulwark', 'Sentinel', 'Guardian', 'Paladin', 'Crusader', 'Warden', 'Keeper', 'AnchorT', 'Pillar', 'Summit', 'Peak', 'Ridge', 'Cliff', 'Stone', 'Granite', 'Obsidian', 'Basalt'],
    jungle: ['Shade', 'Moss', 'Hunt', 'Ghost', 'Leaf', 'Thicket', 'Canopy', 'Root', 'Vine', 'Briar', 'Trail', 'Track', 'Prowl', 'Stalk', 'Ambush', 'Skulk', 'Lurk', 'Crouch', 'DashJ', 'Leap', 'Bound', 'Spring', 'Creek', 'Brook', 'Grove', 'Glade', 'Fern', 'Ivy'],
    mid: ['Spark', 'Nova', 'Arc', 'Flux', 'Rune', 'Prism', 'Cipher', 'Glyph', 'Sigil', 'Hex', 'Volt', 'Surge', 'PulseM', 'Wave', 'Echo', 'Resonance', 'Frequency', 'Signal', 'Beacon', 'Flare', 'Ember', 'Cinder', 'AshM', 'Smoke', 'MistM', 'Vapor', 'Plasma', 'Quark'],
    adc: ['Arrow', 'Pierce', 'Swift', 'Mark', 'Flash', 'BoltA', 'Dart', 'Quiver', 'String', 'Aim', 'Scope', 'Lens', 'Trigger', 'Round', 'Shell', 'Caliber', 'Range', 'Reach', 'Sniper', 'ScoutA', 'Hunter', 'Hawk', 'Falcon', 'Eagle', 'Raven', 'Crow', 'Sparrow', 'Finch'],
    support: ['Ward', 'Shield', 'Anchor', 'Pulse', 'Heal', 'Mend', 'Bind', 'Link', 'Chain', 'Hook', 'Latch', 'Grip', 'Hold', 'Brace', 'Cover', 'Guard', 'Watch', 'Lookout', 'Spotter', 'Radar', 'Ping', 'Call', 'Voice', 'EchoS', 'Relay', 'SignalS', 'BeaconS', 'Lantern'],
  },
};

function regionKey(region: string): string {
  if (region.includes('LEC')) return 'LEC';
  if (region.includes('LCK')) return 'LCK';
  if (region.includes('LPL')) return 'LPL';
  if (region.includes('LCS')) return 'LCS';
  return 'default';
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pickUniqueName(
  list: string[],
  seed: string,
  usedLocal: Set<string>,
  usedGlobal: Set<string>,
): string {
  const idx = hash(seed) % list.length;
  for (let n = 0; n < list.length; n++) {
    const name = list[(idx + n) % list.length];
    const key = name.toLowerCase();
    if (!usedLocal.has(key) && !usedGlobal.has(key)) {
      usedLocal.add(key);
      usedGlobal.add(key);
      return name;
    }
  }
  // Fallback único si el pool se agota
  let i = 1;
  const base = list[idx] || 'Player';
  while (usedGlobal.has(`${base.toLowerCase()}_${i}`)) i++;
  const name = `${base}_${i}`;
  usedLocal.add(name.toLowerCase());
  usedGlobal.add(name.toLowerCase());
  return name;
}

/** Genera roster de 7 jugadores para una org (dedupe local + global). */
export function buildOrgRoster(org: FanOrg, usedGlobal: Set<string> = new Set()): RosterMember[] {
  const pool = NICKS[regionKey(org.region)] || NICKS.default;
  const members: RosterMember[] = [];
  const usedLocal = new Set<string>();
  const displayOrg = fanOrgDisplayName(org);

  for (const role of ROLES) {
    const list = pool[role] || NICKS.default[role]!;
    const name = pickUniqueName(list, `${org.id}-${role}`, usedLocal, usedGlobal);
    members.push({
      id: `${org.id}_${role}_${name.toLowerCase().replace(/\s+/g, '_')}`,
      name,
      role,
      image: `/players/${role}.svg`,
      orgId: org.id,
      orgName: displayOrg,
    });
  }

  for (const role of ['mid', 'adc'] as Role[]) {
    const list = pool[role] || NICKS.default[role]!;
    const name = pickUniqueName(list, `${org.id}-extra-${role}`, usedLocal, usedGlobal);
    members.push({
      id: `${org.id}_x_${role}_${name.toLowerCase().replace(/\s+/g, '_')}`,
      name,
      role,
      image: `/players/${role}.svg`,
      orgId: org.id,
      orgName: displayOrg,
    });
  }

  return members;
}

/** Pool de todas las orgs sin nicks ni etiquetas de equipo repetidos. */
export function buildAllRosters(orgs: FanOrg[]): RosterMember[] {
  const usedGlobal = new Set<string>();
  return orgs.flatMap(o => buildOrgRoster(o, usedGlobal));
}
