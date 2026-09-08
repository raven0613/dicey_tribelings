import assert from 'node:assert/strict';
import test from 'node:test';
import { configuredDice } from '../../dice/diceFactory';
import { createCreatureBattleState } from './creatureState';
import { resolveRerollChain, refreshAuthorityTargets } from './rerollResolution';
import { calculateRollResolution } from '../battleEngine';
import { performControlReroll, performDiceAction, getOppositeFace } from '../rollService';
import { ALL_EQUIPMENT_CATALOG, EQUIPMENT_BALANCE } from '../../../configs/equipment/equipmentConfig';
import { CREATURE_BALANCE } from '../../../configs/creatures/creatureBalanceConfig';
import type { CreatureId } from '../../../types/creatures';
const die = (id: string, a: CreatureId, z: CreatureId, first = 3, rest = 5) => configuredDice(id, id, 'd6', 'amber',
  Array.from({ length: 6 }, (_, index) => [index === 0 ? a : z, index === 0 ? first : rest] as [CreatureId, number]));

test('priest witnesses before each reroll, keeps earned bonus after leaving, and has no retrospective credit', () => {
  const pool = [die('a', 'priest', 'food'), die('b', 'food', 'priest')];
  const steps = resolveRerollChain(pool, [0, 0], createCreatureBattleState(), 0, [], () => 0.5);
  assert.equal(steps[0].state.priestAttacks.a, CREATURE_BALANCE.priest.damagePerReroll);
  const next = resolveRerollChain(pool, steps[0].rolledIndices, steps[0].state, 1, [], () => 0.5)[0];
  assert.equal(next.state.priestAttacks.b, undefined);
  const result = calculateRollResolution(pool, next.rolledIndices, [], next.state);
  assert.equal(result.bonusDice.filter((bonus) => bonus.creature === 'priest').length, 1);
});

test('prankster chain terminates when every source has fired once even if it lands on prankster again', () => {
  const pool = [die('a', 'prankster', 'prankster'), die('b', 'prankster', 'prankster')];
  const steps = resolveRerollChain(pool, [0, 0], createCreatureBattleState(), 0, [], () => 0);
  assert.equal(steps.length, 3);
  assert.deepEqual(steps.at(-1)!.state.prankstersUsed.sort(), ['a', 'b']);
});

test('teachers consume initial-roll eligibility and forced rerolls award coward shield', () => {
  const pool = [die('a', 'teacher', 'teacher'), die('b', 'coward', 'teacher')];
  const state = createCreatureBattleState(); state.teachersAvailable = ['a'];
  const result = resolveRerollChain(pool, [0, 0], state, 1, [], () => 0.5, 'a')[0];
  assert.deepEqual(result.state.teachersAvailable, []);
  assert.equal(result.state.cowardShields.b, 3);
  assert.equal(result.state.teacherBonuses.b, CREATURE_BALANCE.teacher.bonus);
});

test('protected targets resist forced rerolls and create no reroll events', () => {
  const pool = [die('a', 'teacher', 'food'), die('b', 'coward', 'food')];
  const state = createCreatureBattleState(); state.lockedDice = ['b'];
  assert.equal(resolveRerollChain(pool, [0, 0], state, 1, [], () => 0.5, 'a').length, 0);
});

test('authority keeps a live target across other rerolls and preview calls', () => {
  const pool = [die('a', 'family', 'family'), die('b', 'authority', 'authority'), die('c', 'family', 'family')];
  const state = refreshAuthorityTargets(pool, [0, 0, 0], [], createCreatureBattleState());
  const target = state.authorityTargets.b.diceId;
  const other = target === 'a' ? 2 : 0;
  const step = resolveRerollChain(pool, [0, 0, 0], state, other, [], () => 0.5)[0];
  assert.equal(step.state.authorityTargets.b.diceId, target);
  const result = calculateRollResolution(pool, step.rolledIndices, [], step.state);
  assert.deepEqual(result, calculateRollResolution(pool, step.rolledIndices, [], step.state));
});

test('paid reroll, smoke refund and formation use one common Control state', () => {
  const pool = [die('a', 'family', 'food', 5, 3), die('b', 'family', 'food')];
  const equipments = ALL_EQUIPMENT_CATALOG;
  const state = { dicePool: pool, rolledIndices: [0, 0], equipments, creatureBattleState: createCreatureBattleState(),
    control: 0, maxControl: 3, gold: 40, combatPhase: 'CONTROL_PHASE' as const };
  const result = performControlReroll(0, state, () => 0)!;
  assert.equal(result.gold, 40 - EQUIPMENT_BALANCE.paidReroll);
  assert.equal(result.control, EQUIPMENT_BALANCE.pipeRefund);
  const swapped = performDiceAction('swap', 0, { ...state, control: 2 })!;
  assert.equal(swapped.dicePool[0].id, 'b');
  assert.equal(swapped.creatureBattleState.formationUsed, true);
  assert.equal(performDiceAction('swap', 0, { ...state, ...swapped }), null);
});

test('opposite face uses geometry and tetrahedra expose no opposite', () => {
  const cube = die('a', 'family', 'family');
  const opposite = getOppositeFace(cube, 0)!;
  assert.equal(getOppositeFace(cube, opposite), 0);
  assert.equal(getOppositeFace({ ...cube, dieType: 'd4' }, 0), null);
});
