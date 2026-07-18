import assert from 'node:assert/strict';
import { createPausableScheduler } from '../src/lib/pausable-scheduler';
import { manaCostFor, ULT_TOTAL_MANA } from '../src/lib/champion-mechanics';
import { QTE_REPLAY_AD_MS, POST_MATCH_AD_MS } from '../src/components/AdInterstitial';
import { createTurnTeam, createTurnMatch } from '../src/lib/turn-engine';
import { buildAllRosters } from '../src/lib/rosters';
import { FAN_ORGS } from '../src/lib/game-data';

async function sleep(ms: number) {
  await new Promise(r => setTimeout(r, ms));
}

async function testScheduler() {
  const sch = createPausableScheduler();
  let hit = 0;
  sch.schedule(() => { hit += 1; }, 80);
  sch.setPaused(true);
  await sleep(120);
  assert.equal(hit, 0, 'no debe disparar en pausa');
  sch.setPaused(false);
  await sleep(100);
  assert.equal(hit, 1, 'debe disparar al reanudar');
  console.log('✓ Scheduler pausable');
}

function testAdsDurations() {
  assert.equal(POST_MATCH_AD_MS, 8000);
  assert.equal(QTE_REPLAY_AD_MS, 10000);
  assert.equal(ULT_TOTAL_MANA, 50);
  assert.equal(manaCostFor('attack', true), 50);
  console.log('✓ Duraciones de anuncio y coste de definitiva');
}

function testChampionKdaFields() {
  const roster = buildAllRosters(FAN_ORGS.filter(o => o.id === 't1'));
  const blue = createTurnTeam('b', 'T1', 'blue', ['aatrox', 'lee_sin', 'zed', 'jinx', 'thresh'], roster);
  const red = createTurnTeam('r', 'X', 'red', ['garen', 'amumu', 'lux', 'ashe', 'soraka']);
  const tm = createTurnMatch(blue, red);
  const all = [...tm.blue.champions, ...tm.red.champions];
  assert.equal(all.length, 10);
  for (const c of all) {
    assert.equal(typeof c.kills, 'number');
    assert.equal(typeof c.deaths, 'number');
    assert.equal(typeof c.assists, 'number');
    assert.ok(c.stats.maxHp > 0);
    assert.ok(c.stats.maxMana > 0);
  }
  console.log('✓ 10 campeones con HP/MN/KDA');
}

await testScheduler();
testAdsDurations();
testChampionKdaFields();
console.log('\nTodas las verificaciones de partida viva OK');
