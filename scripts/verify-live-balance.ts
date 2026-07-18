import assert from 'node:assert/strict';
import {
  createTurnMatch,
  createTurnTeam,
  finishPendingObjective,
  simulateAITurnMatch,
} from '../src/lib/turn-engine';
import { combatFloatStyle } from '../src/lib/combat-float-style';
import {
  MAX_QTE_REPLAYS_PER_MATCH,
  canReplayQte,
  qteReplaysRemaining,
} from '../src/lib/qte-rules';
import type { TeamPlan } from '../src/types/game';

const BLUE_IDS = ['aatrox', 'lee_sin', 'zed', 'jinx', 'thresh'];
const RED_IDS = ['garen', 'amumu', 'lux', 'ashe', 'soraka'];

function emptyPlan(): TeamPlan {
  return { actions: {}, ultimates: [] };
}

function testCombatFloatPalette() {
  assert.equal(combatFloatStyle('damage', 'blue').numberColor, '#E74C3C');
  assert.equal(combatFloatStyle('damage', 'red').numberColor, '#E74C3C');
  assert.equal(combatFloatStyle('heal', 'blue').signColor, '#2ECC71');
  assert.equal(combatFloatStyle('heal', 'blue').numberColor, '#3498DB');
  assert.equal(combatFloatStyle('heal', 'red').signColor, '#2ECC71');
  assert.equal(combatFloatStyle('heal', 'red').numberColor, '#E74C3C');
  console.log('✓ Paleta de daño y curación por equipo');
}

function testQteReplayLimit() {
  assert.equal(MAX_QTE_REPLAYS_PER_MATCH, 3);
  assert.equal(qteReplaysRemaining(0), 3);
  assert.equal(qteReplaysRemaining(2), 1);
  assert.equal(qteReplaysRemaining(3), 0);
  assert.equal(canReplayQte(2), true);
  assert.equal(canReplayQte(3), false);
  console.log('✓ Tres repeticiones QTE compartidas por partida');
}

function nexusAssaultState() {
  const state = createTurnMatch(
    createTurnTeam('blue', 'Azul', 'blue', BLUE_IDS),
    createTurnTeam('red', 'Rojo', 'red', RED_IDS),
  );
  const nexus = state.structures.find(s => s.id === 'nexus_red')!;
  nexus.hp = 1;
  state.red.nexusHp = 1;
  state.pendingObjective = {
    kind: 'nexus_assault',
    contested: false,
    blueIds: [state.blue.champions[0].instanceId],
    redIds: [],
    objective: null,
    lane: 1,
  };
  state.deferredBluePlan = emptyPlan();
  state.deferredRedPlan = emptyPlan();
  return state;
}

function testNexusAssault() {
  const failed = finishPendingObjective(nexusAssaultState(), {
    skirmishWinner: null,
    attackingTeam: 'blue',
    monsterTaken: false,
  });
  const failedNexus = failed.structures.find(s => s.id === 'nexus_red')!;
  assert.equal(failedNexus.hp, Math.floor(failedNexus.maxHp * 0.25));
  assert.equal(failedNexus.isDestroyed, false);
  assert.equal(failed.isComplete, false);

  const won = finishPendingObjective(nexusAssaultState(), {
    skirmishWinner: null,
    attackingTeam: 'blue',
    monsterTaken: true,
  });
  const wonNexus = won.structures.find(s => s.id === 'nexus_red')!;
  assert.equal(wonNexus.hp, 0);
  assert.equal(wonNexus.isDestroyed, true);
  assert.equal(won.isComplete, true);
  assert.equal(won.winner, 'blue');
  console.log('✓ Asalto QTE: victoria destruye nexo; derrota restaura 25%');
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function verifyMatchBalance(trials = 1000) {
  const winnerKills: number[] = [];
  const loserKills: number[] = [];
  const rounds: number[] = [];
  let nexusFinishes = 0;

  for (let i = 0; i < trials; i++) {
    const match = simulateAITurnMatch(
      createTurnTeam('blue', 'Azul', 'blue', BLUE_IDS),
      createTurnTeam('red', 'Rojo', 'red', RED_IDS),
    );
    const blueWon = match.winner === 'blue';
    winnerKills.push(blueWon ? match.blue.kills : match.red.kills);
    loserKills.push(blueWon ? match.red.kills : match.blue.kills);
    rounds.push(match.round);
    if (match.structures.some(s => s.type === 'nexus' && s.isDestroyed)) nexusFinishes++;
  }

  const winnerMedian = median(winnerKills);
  const loserMedian = median(loserKills);
  const avgWinner = winnerKills.reduce((a, b) => a + b, 0) / trials;
  const avgLoser = loserKills.reduce((a, b) => a + b, 0) / trials;
  const avgTotal = avgWinner + avgLoser;
  const avgRounds = rounds.reduce((a, b) => a + b, 0) / trials;
  const nexusRate = nexusFinishes / trials;

  console.log(
    `✓ Balance ${trials} partidas: media ${avgWinner.toFixed(2)}–${avgLoser.toFixed(2)}, `
    + `mediana ${winnerMedian}–${loserMedian}, ${avgRounds.toFixed(2)} rondas, `
    + `${Math.round(nexusRate * 100)}% por nexo`,
  );

  assert.ok(winnerMedian >= 4 && winnerMedian <= 6, `mediana ganadora fuera de rango: ${winnerMedian}`);
  assert.ok(loserMedian >= 2 && loserMedian <= 4, `mediana perdedora fuera de rango: ${loserMedian}`);
  assert.ok(avgWinner >= 5 && avgWinner <= 6.25, `media ganadora fuera de rango: ${avgWinner}`);
  assert.ok(avgLoser >= 2.5 && avgLoser <= 3.75, `media perdedora fuera de rango: ${avgLoser}`);
  assert.ok(avgTotal >= 7 && avgTotal <= 9.5, `bajas medias fuera de rango: ${avgTotal}`);
  assert.ok(nexusRate <= 0.7, `demasiadas partidas terminan por nexo: ${nexusRate}`);
}

testCombatFloatPalette();
testQteReplayLimit();
testNexusAssault();
verifyMatchBalance();
console.log('\nTodas las verificaciones de balance OK');
