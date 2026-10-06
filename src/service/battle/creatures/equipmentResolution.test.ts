import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import assert from 'node:assert/strict';
import test from 'node:test';
import { die, resolve, gear } from './testFixtures';
import { createCreatureBattleState } from './creatureState';
import { EQUIPMENT_BALANCE as eq } from '../../../configs/equipment/equipmentConfig';
import { CAMP_BUFFS } from '../../../configs/campConfig';
import { buildAttackPlan } from '../attackPlan';
import { monotoneRuns } from './bonusResolution';
import { splitInteger } from './splitInteger';

test('absorb then split applies drum and herald once to each generation', () => {
  const pool = [die('a', { 6: 'blank' }), die('h', { 1: 'herald' })];
  const state = { ...createCreatureBattleState(), firstRerollMemory: { a: 14 }, absorbTarget: 'a', splitEnabled: true,
    rerollBonuses: [{ diceId: 'h', damage: 4 }, { diceId: 'h', damage: 4 }] };
  const result = resolve(pool, [6, 1], ['REROLL_MEMORY', 'REROLL_DROP', 'ABSORB', 'SPLIT', 'RESONATOR'], state);
  assert.equal(result.items[0].finalDamage, 0);
  assert.equal(result.items[0].attackTransferred, true);
  assert.deepEqual(result.bonusDice.filter(bonus => !bonus.absorbed).map(bonus => bonus.bonusDamage), [15, 15, 15]);
  assert.equal(result.items[1].finalDamage, 1 + 2 + 3);
  assert.deepEqual(result, resolve(pool, [6, 1], ['REROLL_MEMORY', 'REROLL_DROP', 'ABSORB', 'SPLIT', 'RESONATOR'], state));
  assert.equal(state.firstBonusUsed, false);
});
test('absorption grants external copies and body repeats inherit the completed attack', () => {
  const pool = [die('a', { 1: 'family', 2: 'family' }), die('p', { 1: 'princess' })];
  pool[0].faces[0].material = 'iridescent';
  const state = { ...createCreatureBattleState(), absorbTarget: 'a', rerollBonuses: [{ diceId: 'p', damage: 4 }] };
  const result = resolve(pool, undefined, ['ABSORB', 'REROLL_DROP'], state);
  assert.equal(result.items[0].finalDamage, 1 + b.family.bonusPerFace * 2 + 4 * 2);
  assert.equal(result.repeatAttacks[0].damage, result.items[0].finalDamage);
});
test('split is opt-in, removes repeat eligibility, and chooses the leftmost highest tie', () => {
  const pool = [die('a', { 1: 'twins', 6: 'twins' }), die('b', { 6: 'blank' })];
  const off = resolve(pool, [1, 6], ['SPLIT']);
  assert.equal(off.repeatAttacks.length, 1);
  const on = resolve(pool, [1, 6], ['SPLIT'], { ...createCreatureBattleState(), splitEnabled: true });
  assert.equal(on.items[0].attackTransferred, true);
  assert.equal(on.repeatAttacks.length, 0);
  assert.equal(on.items[1].finalDamage, 6);
});
test('integer conversion preserves rounded total and emits positive dice only', () => {
  assert.deepEqual(splitInteger(10, eq.splitParts), [4, 3, 3]);
  assert.deepEqual(splitInteger(2, eq.splitParts), [1, 1]);
  assert.deepEqual(splitInteger(0, eq.splitParts), []);
  assert.equal(splitInteger(10.2, eq.splitParts).reduce((a, b) => a + b, 0), 11);
});
test('first source batch copying and low split terminate with N + K + N + N dice', () => {
  const pool = [die('g', { 1: 'gang', 2: 'gang', 3: 'gang' })];
  const result = resolve(pool, undefined, ['FIRST_BONUS', 'LOW_SPLIT', 'RESONATOR']);
  const n = 2, k = 2;
  assert.equal(result.bonusDice.length, n + k + n + n);
  assert.ok(result.bonusDice.every(bonus => bonus.bonusDamage === bonus.originalDamage! + eq.bonusDamage));
  assert.equal(result.nextFirstBonusUsed, true);
  const later = resolve(pool, undefined, ['FIRST_BONUS', 'LOW_SPLIT'], { ...createCreatureBattleState(), firstBonusUsed: true });
  assert.equal(later.bonusDice.length, n + k);
});
test('same-role monotone runs share turning points and stop at equality or different roles', () => {
  const row = (values: number[]) => values.map(baseValue => ({ creature: 'porter', baseValue }));
  assert.deepEqual(monotoneRuns(row([1, 2, 6, 5, 4])), [[0, 1, 2], [2, 3, 4]]);
  assert.deepEqual(monotoneRuns(row([1, 2, 3, 4])), [[0, 1, 2, 3]]);
  assert.deepEqual(monotoneRuns(row([1, 2, 2, 3])), []);
});
test('food rebate floors once and echo never repeats consumption', () => {
  const chef = die('c', { 1: 'chef' }); chef.faces[0].material = 'echo';
  const amount = 26;
  const result = resolve([chef], undefined, ['FOOD_REBATE'], { ...createCreatureBattleState(), storedFood: { c: amount } });
  assert.equal(result.nextStoredFood.c, Math.floor(amount * eq.foodRebate));
  assert.equal(result.bonusDice.reduce((sum, bonus) => sum + bonus.bonusDamage, 0), amount * 2);
});
test('shield operations each count once even when they spend multiple Control', () => {
  const result = resolve([die('b', { 1: 'bulwark' })], undefined, ['CONTROL_SHIELD'], { ...createCreatureBattleState(), controlPayments: [1, 2], controlSpent: 3 });
  assert.equal(result.totalShield, 3 * eq.controlShield);
  assert.equal(result.bonusDice[0].bonusDamage, result.totalShield + 2);
});
test('body combo advances per source body while frugal applies once to every final hit', () => {
  const pool = [die('a', { 1: 'twins', 2: 'twins', 3: 'twins', 4: 'twins' })];
  const result = resolve(pool, undefined, ['BODY_COMBO', 'FRUGAL']);
  const plan = buildAttackPlan(result, 0, gear('BODY_COMBO', 'FRUGAL'));
  assert.deepEqual(plan.map(hit => hit.value), [0, 1, 2].map(i => Math.ceil(4 * eq.frugalMultiplier * (1 + i * eq.bodyComboStep))));
});
test('camp changes only ordinary attacks after repeated attacks have captured their value', () => {
  const pool = [die('t', { 1: 'twins', 6: 'twins' })];
  const state = { ...createCreatureBattleState(), round: 1 };
  const result = resolve(pool, undefined, [], state, { control: 0, maxControl: 3, gold: 0, campBuff: 'sharpen' });
  assert.equal(result.items[0].finalDamage, 6 + CAMP_BUFFS.sharpen.attack);
  assert.equal(result.repeatAttacks[0].damage, 6);
});
test('frugal preserves the absorption total until final damage scaling', () => {
  const pool = [die('a', { 1: 'blank' })];
  const state = { ...createCreatureBattleState(), absorbTarget: 'a', rerollBonuses: [{ diceId: 'a', damage: 4 }] };
  const result = resolve(pool, undefined, ['ABSORB', 'REROLL_DROP', 'FRUGAL'], state);
  assert.equal(result.items[0].finalDamage, (1 + 4) * eq.frugalMultiplier);
});
