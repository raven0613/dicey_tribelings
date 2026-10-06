import assert from 'node:assert/strict';
import test from 'node:test';
import { die, faceIndex, gear, resolve } from './testFixtures';
import { createCreatureBattleState, startCreatureRound } from './creatureState';
import { resolveRerollChain, refreshIdentitySnapshot } from './rerollResolution';
import { performDiceAction } from '../rollService';
import { EQUIPMENT_BALANCE as eq } from '../../../configs/equipment/equipmentConfig';
import { MATERIAL_BALANCE } from '../../../configs/materials/materialConfig';

test('first reroll memory reads material base and is cleared by the next reroll while first-use stays spent', () => {
  const pool = [die('a', {})];
  pool[0].faces[faceIndex(6)].material = 'foil';
  const equipment = gear('REROLL_MEMORY', 'REROLL_DROP');
  const first = resolveRerollChain(pool, [faceIndex(6)], createCreatureBattleState(), 0, equipment, () => 0)[0];
  const base = 6 + MATERIAL_BALANCE.foil;
  assert.equal(first.state.firstRerollMemory.a, base * eq.rerollMemory);
  assert.deepEqual(first.state.rerollBonuses, [{ diceId: 'a', damage: base - 1 }]);
  assert.equal(resolve(pool, [1], ['REROLL_MEMORY'], first.state).items[0].finalDamage, 1 + base * eq.rerollMemory);
  const second = resolveRerollChain(pool, first.rolledIndices, first.state, 0, equipment, () => 0)[0];
  assert.deepEqual(second.state.firstRerollMemory, {});
  assert.equal(second.state.firstRerollUsed, true);
  assert.equal(startCreatureRound(second.state, 2).firstRerollUsed, false);
});

test('flip clears inherited gains while patient layers survive directed face changes', () => {
  const pool = [die('a', {})];
  const state = { ...createCreatureBattleState(), inheritance: { a: 3 }, teacherBonuses: { a: 3 },
    firstRerollMemory: { a: 3 }, firstRerollUsed: true, chargeLayers: { a: 2 } };
  const result = performDiceAction('flip', 0, { dicePool: pool, rolledIndices: [faceIndex(1)],
    equipments: gear('PRISM', 'PATIENT', 'REROLL_MEMORY'), creatureBattleState: state,
    control: eq.prismCost, maxControl: eq.prismCost, gold: 0, combatPhase: 'CONTROL_PHASE' })!;
  assert.deepEqual(result.creatureBattleState.inheritance, {});
  assert.deepEqual(result.creatureBattleState.teacherBonuses, {});
  assert.deepEqual(result.creatureBattleState.firstRerollMemory, {});
  assert.equal(result.creatureBattleState.chargeLayers.a, 2);
  assert.equal(result.creatureBattleState.firstRerollUsed, true);
  assert.equal(result.comboSummary.items[0].finalDamage, 6 + 2);
});

test('patient layers commit after the round, cap, persist through initial rolls and clear on actual rerolls', () => {
  const pool = [die('a', {})];
  let state = createCreatureBattleState();
  for (let turn = 0; turn <= eq.chargeLimit + 1; turn++) {
    const result = resolve(pool, [1], ['PATIENT'], state);
    assert.equal(result.items[0].finalDamage, 1 + Math.min(turn, eq.chargeLimit));
    assert.deepEqual(state.chargeLayers, turn ? { a: Math.min(turn, eq.chargeLimit) } : {});
    state = startCreatureRound({ ...state, chargeLayers: result.nextChargeLayers }, turn + 1);
  }
  const step = resolveRerollChain(pool, [0], state, 0, gear('PATIENT'), () => 0)[0];
  assert.equal(step.state.chargeLayers.a, 0);
  assert.equal(resolve(pool, [6], ['PATIENT'], step.state).nextChargeLayers.a, 0);
});

test('coronation records a real landing change and its new crown separately, then previews remain pure', () => {
  const pool = [die('a', { 1: 'family', 6: 'family' })];
  const equipment = gear('CROWN', 'CORONATION');
  const initial = refreshIdentitySnapshot(pool, [0], equipment, createCreatureBattleState());
  assert.equal(initial.identityChanges, 1);
  const step = resolveRerollChain(pool, [0], initial, 0, equipment, () => 0)[0];
  assert.equal(step.state.identityChanges, initial.identityChanges + 2);
  const result = resolve(pool, [6], ['CROWN', 'CORONATION'], step.state);
  assert.equal(result.bonusDice.length, step.state.identityChanges * eq.coronationCount);
  assert.deepEqual(result, resolve(pool, [6], ['CROWN', 'CORONATION'], step.state));
});

test('multiple pranksters affect all neighbors and a manually rerolled source can be targeted again', () => {
  const pool = [die('a', { 1: 'blank' }), die('b', { 1: 'prankster' }), die('c', { 1: 'prankster' }), die('d', {})];
  const steps = resolveRerollChain(pool, pool.map(() => faceIndex(1)), createCreatureBattleState(), 1, [], () => 0);
  assert.deepEqual(steps.map(step => step.dieIndex), [1, 0, 2, 1, 3]);
  assert.deepEqual(steps.at(-1)!.state.prankstersUsed, ['b', 'c']);
  let previous = pool.map(() => faceIndex(1));
  for (const step of steps) {
    assert.notEqual(step.rolledIndices[step.dieIndex], previous[step.dieIndex]);
    previous = step.rolledIndices;
  }
});
