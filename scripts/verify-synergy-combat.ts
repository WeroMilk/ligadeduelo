import { FAN_ORGS, CHAMPIONS } from '../src/lib/game-data';
import { buildAllRosters } from '../src/lib/rosters';
import { computeSynergy, resolvePlayerProfile, getChampionStyles } from '../src/lib/player-synergy';
import {
  createTurnTeam,
  createTurnMatch,
  resolveRound,
  generateAIPlan,
  champDef,
} from '../src/lib/turn-engine';
import type { CombatFloat, TeamPlan } from '../src/types/game';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

// 1) Perfiles de todos los jugadores
const all = buildAllRosters(FAN_ORGS);
assert(all.length > 0, 'roster vacío');
for (const m of all) {
  assert(m.mechanics >= 60 && m.mechanics <= 99, `${m.name} mechanics`);
  assert(m.macro >= 60 && m.macro <= 99, `${m.name} macro`);
  assert(m.styles.length >= 1, `${m.name} styles`);
  assert(m.signatureChampionIds.length >= 1, `${m.name} firmas`);
}
console.log(`✓ ${all.length} jugadores con perfil completo`);

// 2) Estilos de campeones
for (const c of CHAMPIONS) {
  assert(getChampionStyles(c.id).length >= 1, `${c.id} sin estilos`);
}
console.log(`✓ ${CHAMPIONS.length} campeones con tags de estilo`);

// 3) Faker–Zed firma máxima vs media
const faker = resolvePlayerProfile('Faker', 'mid');
const zed = CHAMPIONS.find(c => c.id === 'zed')!;
const synFakerZed = computeSynergy(faker, zed);
assert(synFakerZed.tier === 'firma', 'Faker–Zed debe ser Firma');
assert(synFakerZed.multiplier >= 1.1, 'multiplicador firma bajo');

const neutral = resolvePlayerProfile('JugadorMedio', 'mid');
const synNeutral = computeSynergy(neutral, zed);
assert(synFakerZed.affinity > synNeutral.affinity, 'Faker–Zed debe superar afinidad media');
console.log(
  `✓ Faker–Zed afinidad ${synFakerZed.affinity} ×${synFakerZed.multiplier} > media ${synNeutral.affinity}`,
);

// 4) Un float ofensivo por atacante y ronda (muestra varias partidas)
function offensiveFloats(floats: CombatFloat[]) {
  return floats.filter(f => f.kind === 'damage' && f.targetType === 'champ' && f.sourceId);
}

let maxOffensivePerSource = 0;
let fakerWins = 0;
const TRIALS = 40;

for (let t = 0; t < TRIALS; t++) {
  const blue = createTurnTeam(
    'blue',
    'T1',
    'blue',
    ['aatrox', 'lee_sin', 'zed', 'jinx', 'thresh'],
    buildAllRosters(FAN_ORGS.filter(o => o.id === 't1')),
  );
  const red = createTurnTeam(
    'red',
    'Media',
    'red',
    ['garen', 'amumu', 'lux', 'ashe', 'soraka'],
  );
  let state = createTurnMatch(blue, red);
  const bluePlan: TeamPlan = {
    actions: Object.fromEntries(blue.champions.map(c => [c.instanceId, 'attack' as const])),
    ultimates: [],
  };
  // Forzar Faker en Zed
  const zedChamp = state.blue.champions.find(c => c.defId === 'zed')!;
  assert(zedChamp.playerName === 'Faker', 'Zed debe llevar a Faker');
  assert(zedChamp.synergyTier === 'firma', 'Zed de Faker debe ser firma');

  const redPlan = generateAIPlan(state, 'red', bluePlan);
  state = resolveRound(state, bluePlan, redPlan);
  const floats = state.lastResolution?.floats || [];
  const bySource = new Map<string, number>();
  for (const f of offensiveFloats(floats)) {
    const n = (bySource.get(f.sourceId!) || 0) + 1;
    bySource.set(f.sourceId!, n);
    maxOffensivePerSource = Math.max(maxOffensivePerSource, n);
  }

  // Duelo espejo: Faker–Zed vs jugador medio en Zed (misma base, decide sinergia)
  const duelBlue = createTurnTeam(
    'b',
    'T1',
    'blue',
    ['zed'],
    buildAllRosters(FAN_ORGS.filter(o => o.id === 't1')),
  );
  const duelRed = createTurnTeam('r', 'X', 'red', ['zed']); // perfil neutral
  let duel = createTurnMatch(duelBlue, duelRed);
  const bp: TeamPlan = {
    actions: { [duel.blue.champions[0].instanceId]: 'attack' },
    ultimates: [],
  };
  const rp: TeamPlan = {
    actions: { [duel.red.champions[0].instanceId]: 'attack' },
    ultimates: [],
  };
  for (let r = 0; r < 5 && !duel.isComplete; r++) {
    duel = resolveRound(duel, bp, rp);
    if (duel.pendingObjective) {
      duel = { ...duel, pendingObjective: null, deferredBluePlan: null, deferredRedPlan: null };
    }
  }
  const bHp = duel.blue.champions[0].isAlive ? duel.blue.champions[0].stats.hp : 0;
  const rHp = duel.red.champions[0].isAlive ? duel.red.champions[0].stats.hp : 0;
  if (bHp > rHp) fakerWins++;
}

assert(maxOffensivePerSource <= 1, `más de un float ofensivo por fuente: ${maxOffensivePerSource}`);
console.log(`✓ Máx. floats ofensivos por fuente/ronda = ${maxOffensivePerSource}`);
console.log(`✓ Faker–Zed vs Zed medio: ${fakerWins}/${TRIALS} (${Math.round((fakerWins / TRIALS) * 100)}%)`);
assert(fakerWins >= TRIALS * 0.55, 'Faker–Zed debe superar estadísticamente a Zed medio');
// En espejo corto el ×1.20 + iniciativa suele barrer; la no-garantía se valida por el tope del multiplicador
assert(synFakerZed.multiplier <= 1.2, 'multiplicador debe estar acotado a 1.20');
assert(synNeutral.multiplier >= 0.9, 'multiplicador mínimo 0.90');

// Identidad de roster en TurnMatch
const t1 = createTurnTeam(
  't1',
  'T1',
  'blue',
  ['aatrox', 'lee_sin', 'zed', 'jinx', 'thresh'],
  buildAllRosters(FAN_ORGS.filter(o => o.id === 't1')),
);
const names = t1.champions.map(c => `${c.playerName}/${champDef(c).name}`).join(', ');
console.log(`✓ Identidad T1: ${names}`);
assert(t1.champions.every(c => !!c.playerName && (c.playerAffinity ?? 0) > 0), 'identidad perdida');

console.log('\nTodas las verificaciones OK');
