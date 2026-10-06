import { distributeInitialRations } from './foodResolution';
import { PAID_REROLL_CONFIG } from '../../../configs/controlConfig';
import { getPaidRerollCost } from '../rerollCost';
import assert from 'node:assert/strict';
import test from 'node:test';
import { configuredDice } from '../../dice/diceFactory';
import { getDiceGeometry } from '../../dice/diceGeometry';
import { calculateRollResolution } from '../battleEngine';
import { createCreatureBattleState, startCreatureRound, combatNumber } from './creatureState';
import { retainPlayerShield } from '../playerShield';
import { performControlReroll, performStartBattleRoll } from '../rollService';
import { getActionTargets } from '../rollService';
import { ALL_EQUIPMENT_CATALOG, EQUIPMENT_BALANCE as eq } from '../../../configs/equipment/equipmentConfig';
import { FOOD_CAPACITY } from '../../../configs/materials/materialConfig';
import { INITIAL_PLAYER_STATS } from '../../../configs/gameConfig';
import type { CreatureId } from '../../../types/creatures';
import type { Dice } from '../../../types/game';

const gear = (...rules: string[]) => ALL_EQUIPMENT_CATALOG.filter((item) => rules.includes(item.ruleId));
const die = (id: string, creature: CreatureId, value = 3, type: Dice['dieType'] = 'd6') =>
  configuredDice(id, id, type, 'amber', getDiceGeometry(type).map(() => [creature, value]));

test('slot match reads effective base before food boost and resonance', () => {
  const pool = [die('food', 'food', 2), die('blank', 'blank', 2), die('farmer', 'farmer', 5)];
  pool[2].faces[0].material = 'resonance';
  const plain = calculateRollResolution(pool, [0, 0, 0], []);
  const matched = calculateRollResolution(pool, [0, 0, 0], gear('SLOTS'));
  assert.deepEqual(matched.items.map(item => item.finalDamage), plain.items.map((item, i) =>
    item.finalDamage + (i < 2 ? item.baseValue * (eq.matchedMultiplier - 1) : 0)));
  assert.deepEqual(matched.items.map(item => item.baseValue), [2, 2, 5]);
});

test('rations distribute a capped integer total once, before food conversion or chef release', () => {
  const pool = [die('a', 'porter'), die('b', 'porter'), die('c', 'porter')];
  pool.forEach(item => { item.faces[1].creature = 'chef'; });
  const amount = 44;
  assert.deepEqual(distributeInitialRations(pool, amount), { a: 15, b: 15, c: 14 });
  assert.deepEqual(distributeInitialRations(pool, 2), { a: 1, b: 1 });
  assert.deepEqual(distributeInitialRations(pool, 0), {});
  const capped = distributeInitialRations(pool, FOOD_CAPACITY.crocodile + 1);
  assert.equal(Object.values(capped).reduce((sum, value) => sum + value, 0), FOOD_CAPACITY.crocodile);
  assert.ok(Object.values(capped).every(Number.isInteger));
  const state = createCreatureBattleState();
  const equipment = gear('RATIONS');
  const first = performStartBattleRoll(pool, equipment, state, undefined, amount, () => 0);
  assert.deepEqual(first.creatureBattleState.storedFood, distributeInitialRations(pool, amount));
  assert.deepEqual(state.storedFood, {});
  const second = performStartBattleRoll(pool, equipment, first.creatureBattleState, undefined, amount, () => 0);
  assert.deepEqual(second.creatureBattleState.storedFood, first.creatureBattleState.storedFood);
  assert.deepEqual(second.creatureBattleState.initialRations, {});
  const released = calculateRollResolution(pool, [1, 1, 1], equipment, first.creatureBattleState);
  assert.equal(released.bonusDice.reduce((sum, bonus) => sum + bonus.bonusDamage, 0), amount);
  assert.deepEqual(released.nextStoredFood, { a: 0, b: 0, c: 0 });
  assert.deepEqual(performStartBattleRoll(pool, [], state, undefined, amount, () => 0).creatureBattleState.storedFood, {});
  pool.forEach(item => { item.faces[1].creature = 'porter'; });
  assert.deepEqual(distributeInitialRations(pool, amount), {});
});

test('remaining shields expire or retain once; global equipment shields belong to the player and feed bulwark', () => {
  const remaining = eq.barricadeShield;
  assert.equal(retainPlayerShield(remaining, []), 0);
  const equipment = gear('SHIELD_RETENTION', 'BARRICADE');
  const retained = retainPlayerShield(remaining, equipment);
  assert.equal(retained, Math.ceil(combatNumber(remaining * eq.shieldRetention)));
  assert.equal(retainPlayerShield(1, equipment), Math.ceil(eq.shieldRetention));
  const pool = [die('a', 'bulwark')];
  const result = calculateRollResolution(pool, [0], equipment);
  assert.equal(result.items[0].shieldGranted, 0);
  assert.equal(result.totalShield, eq.barricadeShield);
  assert.equal(result.bonusDice[0].bonusDamage, eq.barricadeShield + pool[0].faces[0].baseValue);
  assert.ok(result.events.some((event) => event.equipmentId && event.changes.some((change) => change.kind === 'shield' && change.targetId === 'player')));
});

test('fractional coward shield rounds up before feeding bulwark and survives as integer shield', () => {
  const value = 3 * eq.frugalMultiplier;
  const pool = [die('coward', 'coward', value), die('bulwark', 'bulwark')];
  const state = { dicePool: pool, rolledIndices: [0, 0], equipments: [],
    creatureBattleState: createCreatureBattleState(), control: INITIAL_PLAYER_STATS.maxControl,
    maxControl: INITIAL_PLAYER_STATS.maxControl, gold: 0, combatPhase: 'CONTROL_PHASE' as const };
  const step = performControlReroll(0, state, () => 0)!.steps.at(-1)!;
  const result = calculateRollResolution(pool, step.rolledIndices, [], step.state);
  const shield = Math.ceil(combatNumber(value));
  assert.equal(step.state.cowardShields.coward, shield);
  assert.equal(result.items[0].shieldGranted, shield);
  assert.equal(result.totalShield, shield);
  assert.equal(result.bonusDice[0].bonusDamage, shield + pool[1].faces[0].baseValue);
  assert.ok(result.events.flatMap((event) => event.changes).filter((change) => change.kind === 'shield')
    .every((change) => Number.isInteger(change.before) && Number.isInteger(change.after)));
});

test('paid rerolls charge the growing battle price, preserve it across rounds and reset at a new battle', () => {
  const pool = [die('a', 'food')];
  let state = { dicePool: pool, rolledIndices: [0], equipments: [],
    creatureBattleState: createCreatureBattleState(), control: 0, maxControl: INITIAL_PLAYER_STATS.maxControl,
    gold: PAID_REROLL_CONFIG.goldStep * (1 + 2 + 3), combatPhase: 'CONTROL_PHASE' as const };
  for (let purchase = 1; purchase <= 3; purchase++) {
    const result = performControlReroll(0, state, () => 0)!;
    assert.equal(result.gold, state.gold - PAID_REROLL_CONFIG.goldStep * purchase);
    const last = result.steps.at(-1)!;
    assert.equal(last.state.paidRerolls, purchase);
    assert.equal(last.state.paidRerollUsed, true);
    state = { ...state, rolledIndices: last.rolledIndices, gold: result.gold,
      creatureBattleState: startCreatureRound(last.state, last.state.seed) };
    assert.equal(state.creatureBattleState.paidRerolls, purchase);
    assert.equal(state.creatureBattleState.paidRerollUsed, false);
  }
  assert.equal(getPaidRerollCost(createCreatureBattleState().paidRerolls, []), PAID_REROLL_CONFIG.goldStep);
});

test('free Control has priority; discounted gold rerolls cannot refund Control or activate frugal', () => {
  const pool = [die('a', 'food')];
  const equipment = gear('COUNTERWEIGHT', 'PIPE', 'FRUGAL');
  const cost = Math.ceil(PAID_REROLL_CONFIG.goldStep * eq.paidRerollMultiplier);
  const state = { dicePool: pool, rolledIndices: [0], equipments: equipment,
    creatureBattleState: createCreatureBattleState(), control: 0, maxControl: INITIAL_PLAYER_STATS.maxControl,
    gold: cost, combatPhase: 'CONTROL_PHASE' as const };
  const paid = performControlReroll(0, state, () => 0)!;
  assert.equal(paid.control, 0);
  assert.equal(paid.gold, 0);
  assert.equal(paid.steps[0].state.pipeUsed, false);
  const value = calculateRollResolution(pool, paid.steps[0].rolledIndices, equipment, paid.steps[0].state);
  assert.equal(value.items[0].finalDamage, 3);
  const controlPaid = performControlReroll(0, { ...state, control: 1 }, () => 0)!;
  assert.equal(controlPaid.control, eq.pipeRefund);
  assert.equal(controlPaid.gold, cost);
  assert.equal(controlPaid.steps[0].state.paidRerolls, 0);
  assert.equal(controlPaid.steps[0].state.pipeUsed, true);
  const recovered = performControlReroll(0, { ...state, control: 1, creatureBattleState: paid.steps[0].state }, () => 0)!;
  assert.equal(recovered.steps[0].state.paidRerolls, paid.steps[0].state.paidRerolls);
  assert.equal(recovered.gold, state.gold);
  const insufficient = { ...state, gold: cost - 1 };
  assert.deepEqual(getActionTargets('reroll', insufficient), []);
  assert.equal(performControlReroll(0, insufficient), null);
  assert.equal(state.creatureBattleState.paidRerolls, 0);
  const sealed = { ...state, creatureBattleState: { ...state.creatureBattleState, sealedDice: ['a'] } };
  assert.equal(performControlReroll(0, sealed), null);
});

test('one paid action charges once for its full prankster chain; teacher chains stay free', () => {
  const pool = [die('teacher', 'teacher'), die('a', 'prankster'), die('b', 'prankster')];
  const state = { dicePool: pool, rolledIndices: [0, 0, 0], equipments: [],
    creatureBattleState: { ...createCreatureBattleState(), teachersAvailable: ['teacher'] },
    control: 0, maxControl: INITIAL_PLAYER_STATS.maxControl, gold: PAID_REROLL_CONFIG.goldStep,
    combatPhase: 'CONTROL_PHASE' as const };
  const paid = performControlReroll(1, state, () => 0)!;
  assert.ok(paid.steps.length > 1);
  assert.equal(paid.gold, 0);
  assert.ok(paid.steps.every((step) => step.state.paidRerolls === 1));
  const free = performControlReroll(1, state, () => 0, 'teacher')!;
  assert.ok(free.steps.length > 1);
  assert.equal(free.gold, state.gold);
  assert.ok(free.steps.every((step) => step.state.paidRerolls === 0 && !step.state.paidRerollUsed));
});
