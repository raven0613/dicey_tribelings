import { getPaidRerollCost } from '../rerollCost';
import assert from 'node:assert/strict';
import test from 'node:test';
import { configuredDice } from '../../dice/diceFactory';
import { createCreatureBattleState } from './creatureState';
import { resolveRerollChain, refreshAuthorityTargets } from './rerollResolution';
import { calculateRollResolution } from '../battleEngine';
import { performControlReroll, performDiceAction, getOppositeFace } from '../rollService';
import { ALL_EQUIPMENT_CATALOG } from '../../../configs/equipment/equipmentConfig';
import { CREATURE_BALANCE } from '../../../configs/creatures/creatureBalanceConfig';
import type { CreatureId } from '../../../types/creatures';
const die = (id: string, a: CreatureId, z: CreatureId, first = 3, rest = 5) => configuredDice(id, id, 'd6', 'amber',
  Array.from({ length: 6 }, (_, index) => [index === 0 ? a : z, index === 0 ? first : rest] as [CreatureId, number]));

test('altars count only their own die and retain unspent charges while priest is face down', () => {
  const pool = [die('a', 'priest', 'food'), die('b', 'food', 'priest')];
  const state = createCreatureBattleState(); state.altars = { a: 0, b: 0 };
  const first = resolveRerollChain(pool, [0, 0], state, 0, [], () => 0.5)[0];
  assert.deepEqual(first.state.altars, { a: 1, b: 0 });
  const next = resolveRerollChain(pool, first.rolledIndices, first.state, 1, [], () => 0.5)[0];
  const result = calculateRollResolution(pool, next.rolledIndices, [], next.state);
  assert.deepEqual(result.nextAltars, { a: 1, b: 0 });
  assert.equal(result.bonusDice.length, 1);
  assert.equal(result.bonusDice[0].bonusDamage, CREATURE_BALANCE.priest.damagePerReroll);
});

test('five-charge priest splits retroactive tier damage without losing odd remainder', () => {
  const state = createCreatureBattleState(); state.altars.a = CREATURE_BALANCE.priest.splitAt;
  const result = calculateRollResolution([die('a', 'priest', 'food')], [0], [], state);
  const total = CREATURE_BALANCE.priest.splitAt * CREATURE_BALANCE.priest.highDamage;
  assert.deepEqual(result.bonusDice.map((bonus) => bonus.bonusDamage), [Math.floor(total / 2), Math.ceil(total / 2)]);
  assert.equal(result.nextAltars.a, 0);
  assert.equal(state.altars.a, CREATURE_BALANCE.priest.splitAt);
});

test('teacher includes its own reroll in the team count and freezes the earned amount', () => {
  const pool = [die('t', 'teacher', 'teacher'), die('a', 'coward', 'food')];
  const state = createCreatureBattleState(); state.teachersAvailable = ['t']; state.rerollCount = 4;
  const step = resolveRerollChain(pool, [0, 0], state, 1, [], () => 0, 't')[0];
  assert.equal(step.state.teacherBonuses.a, (state.rerollCount + 1) * CREATURE_BALANCE.teacher.bonus);
  const next = resolveRerollChain(pool, step.rolledIndices, step.state, 0, [], () => 0)[0];
  assert.equal(next.state.teacherBonuses.a, step.state.teacherBonuses.a);
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
  assert.equal(result.gold, state.gold - getPaidRerollCost(state.creatureBattleState.paidRerolls, equipments));
  assert.equal(result.control, state.control);
  assert.equal(result.steps.at(-1)!.state.pipeUsed, false);
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

test('teacher excludes fruit while an edge prankster rerolls its only food neighbor', () => {
  const pool = [die('t', 'teacher', 'teacher', 10), die('f', 'fruit', 'fruit', 1), die('p', 'prankster', 'food', 3)];
  const state = createCreatureBattleState(); state.teachersAvailable = ['t'];
  const operation = { dicePool: pool, rolledIndices: [0, 0, 0], equipments: [], creatureBattleState: state, control: 1, maxControl: 3, gold: 0, combatPhase: 'CONTROL_PHASE' as const };
  assert.equal(performControlReroll(1, operation, () => 0, 't'), null);
  assert.ok(performControlReroll(2, operation, () => 0, 't'));
  const chain = resolveRerollChain(pool, [0, 0, 0], state, 2, [], () => 0);
  assert.deepEqual(chain.map((step) => step.dieIndex), [2, 1]);
});


test('edge pranksters reroll food on either side and respect protection and seals', () => {
  for (const sourceIndex of [0, 1]) {
    const pool = [die('p', 'prankster', 'prankster'), die('f', 'food', 'food')];
    if (sourceIndex === 1) pool.reverse();
    const state = createCreatureBattleState();
    const steps = resolveRerollChain(pool, [0, 0], state, sourceIndex, [], () => 0);
    assert.deepEqual(steps.map((step) => step.dieIndex), [sourceIndex, 1 - sourceIndex]);
    for (const protection of [{ lockedDice: ['f'] }, { sealedDice: ['f'] }]) {
      const protectedSteps = resolveRerollChain(pool, [0, 0], { ...state, ...protection }, sourceIndex, [], () => 0);
      assert.deepEqual(protectedSteps.map((step) => step.dieIndex), [sourceIndex]);
    }
  }
});
