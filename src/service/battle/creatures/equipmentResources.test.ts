import { PAID_REROLL_CONFIG } from '../../../configs/controlConfig';
import { getPaidRerollCost } from '../rerollCost';
import assert from 'node:assert/strict';
import test from 'node:test';
import { configuredDice } from '../../dice/diceFactory';
import { getDiceGeometry } from '../../dice/diceGeometry';
import { calculateRollResolution } from '../battleEngine';
import { createCreatureBattleState, startCreatureRound, combatNumber } from './creatureState';
import { retainPlayerShield } from '../playerShield';
import { performControlReroll } from '../rollService';
import { getActionTargets } from '../rollService';
import { ALL_EQUIPMENT_CATALOG, EQUIPMENT_BALANCE as eq } from '../../../configs/equipment/equipmentConfig';
import { CREATURE_BASE_VALUES as values } from '../../../configs/creatures/creatureStickerConfig';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { FOOD_CAPACITY, MATERIAL_BALANCE } from '../../../configs/materials/materialConfig';
import { INITIAL_PLAYER_STATS } from '../../../configs/gameConfig';
import type { CreatureId } from '../../../types/creatures';
import type { Dice } from '../../../types/game';

const gear = (...rules: string[]) => ALL_EQUIPMENT_CATALOG.filter((item) => rules.includes(item.ruleId));
const die = (id: string, creature: CreatureId, value = values[creature], type: Dice['dieType'] = 'd6') =>
  configuredDice(id, id, type, 'amber', getDiceGeometry(type).map(() => [creature, value]));

test('slot match reads the rolled base before farmer, whistle and resonance bonuses', () => {
  const base = values.food;
  const pool = [die('food', 'food', base), die('porter', 'porter', base),
    die('sister', 'sisters', base + b.farmer.foodBonus), die('farmer', 'farmer')];
  pool[3].faces[0].material = 'resonance';
  const state = { ...createCreatureBattleState(), lockedDice: ['food'] };
  const bare = calculateRollResolution(pool, pool.map(() => 0), gear('WHISTLE'), state);
  const matched = calculateRollResolution(pool, pool.map(() => 0), gear('WHISTLE', 'SLOTS'), state);
  assert.deepEqual(matched.items.map((item) => item.baseValue), pool.map((item) => item.faces[0].baseValue));
  assert.deepEqual(matched.items.map((item, index) => item.finalDamage - bare.items[index].finalDamage),
    [base * (eq.matchedMultiplier - 1), base * (eq.matchedMultiplier - 1), 0, 0]);
  assert.equal(matched.items[2].finalDamage, pool[2].faces[0].baseValue + MATERIAL_BALANCE.resonance);
});

test('porter prefixes reset at a gap and do not copy equipment or earlier relay bonuses', () => {
  const pool = ['porter', 'porter', 'food', 'porter', 'porter'].map((role, index) => die(`${index}`, role as CreatureId, values.porter));
  const plain = calculateRollResolution(pool, pool.map(() => 0), []);
  const matched = calculateRollResolution(pool, pool.map(() => 0), gear('SLOTS'));
  assert.deepEqual(plain.items.map((item) => item.finalDamage),
    [values.porter, values.porter * 2, values.porter, values.porter, values.porter * 2]);
  for (const [index, item] of matched.items.entries()) assert.equal(item.finalDamage - plain.items[index].finalDamage,
    values.porter * (eq.matchedMultiplier - 1));
});

test('family scales by effective face count across dice geometries, sisters stop scaling after activation', () => {
  for (const type of ['d4', 'd6', 'd8', 'd10', 'd12'] as const) {
    const family = die('family', 'family', values.family, type);
    family.faces[1].temporarySticker = { name: '', description: '', creature: 'food' };
    const result = calculateRollResolution([family], [0], []);
    assert.equal(result.items[0].finalDamage, combatNumber(values.family * (1 + (family.faces.length - 2) * b.family.perFace)));
  }
  for (const count of [1, b.sisters.minimum, b.sisters.minimum + 1]) {
    const pool = Array.from({ length: count }, (_, index) => die(`${index}`, 'sisters'));
    const result = calculateRollResolution(pool, pool.map(() => 0), []);
    assert.ok(result.items.every((item) => item.finalDamage === values.sisters * (count >= b.sisters.minimum ? b.sisters.multiplier : 1)));
  }
});

test('rations distribute one capped total, keep their equipment source and never feed next battle leftovers', () => {
  const pool = [die('a', 'porter'), die('b', 'porter')];
  pool.forEach((item) => { item.faces[1].creature = 'chef'; });
  const amount = values.food + 1;
  const state = { ...createCreatureBattleState(), virtualFood: amount };
  const equipment = gear('RATIONS');
  const result = calculateRollResolution(pool, [0, 0], equipment, state);
  assert.deepEqual(result.nextStoredFood, { a: Math.ceil(amount / 2), b: Math.floor(amount / 2) });
  assert.equal(result.leftoverFood, 0);
  assert.deepEqual(state.storedFood, {});
  assert.deepEqual(result, calculateRollResolution(pool, [0, 0], equipment, state));
  const events = result.events.filter((event) => event.changes.some((change) => change.kind === 'food'));
  assert.ok(events.every((event) => event.equipmentId === equipment[0].id && !event.sourceDiceId));
  const capped = calculateRollResolution(pool, [0, 0], equipment,
    { ...state, storedFood: { a: FOOD_CAPACITY.crocodile - 1 } });
  assert.equal(Object.values(capped.nextStoredFood).reduce((sum, value) => sum + value, 0), FOOD_CAPACITY.crocodile);
  pool.forEach((item) => { item.faces[1].creature = 'porter'; });
  assert.deepEqual(calculateRollResolution(pool, [0, 0], equipment, state).nextStoredFood, {});
});

test('remaining shields expire or retain once; global equipment shields belong to the player and feed bulwark', () => {
  const remaining = INITIAL_PLAYER_STATS.maxHp;
  assert.equal(retainPlayerShield(remaining, []), 0);
  const equipment = gear('SHIELD_RETENTION', 'BARRICADE');
  const retained = retainPlayerShield(remaining, equipment);
  assert.equal(retained, combatNumber(remaining * eq.shieldRetention));
  const pool = [die('a', 'bulwark')];
  const result = calculateRollResolution(pool, [0], equipment);
  assert.equal(result.items[0].shieldGranted, 0);
  assert.equal(result.totalShield, eq.barricadeShield);
  assert.equal(result.bonusDice[0].bonusDamage, eq.barricadeShield);
  assert.ok(result.events.some((event) => event.equipmentId && event.changes.some((change) => change.kind === 'shield' && change.targetId === 'player')));
});

test('paid rerolls charge the growing battle price, preserve it across rounds and reset at a new battle', () => {
  const pool = [die('a', 'food')];
  let state = { dicePool: pool, rolledIndices: [0], equipments: [],
    creatureBattleState: createCreatureBattleState(), control: 0, maxControl: INITIAL_PLAYER_STATS.maxControl,
    gold: INITIAL_PLAYER_STATS.gold + PAID_REROLL_CONFIG.goldStep * 3, combatPhase: 'CONTROL_PHASE' as const };
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
  assert.equal(value.items[0].finalDamage, values.food);
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
