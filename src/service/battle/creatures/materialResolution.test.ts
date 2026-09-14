import assert from 'node:assert/strict';
import test from 'node:test';
import { configuredDice } from '../../dice/diceFactory';
import { getEffectiveFace } from '../../dice/diceFaces';
import { calculateRollResolution } from '../battleEngine';
import { createCreatureBattleState } from './creatureState';
import { performStartBattleRoll } from '../rollService';
import { resolveRerollChain } from './rerollResolution';
import { commitMaterialRound } from './materialResolution';
import type { CreatureId } from '../../../types/creatures';
import type { FaceMaterial } from '../../../types/materials';
const die = (id: string, role: CreatureId, value = 4, material?: FaceMaterial) => {
  const result = configuredDice(id, id, 'd6', 'amber', Array.from({ length: 6 }, () => [role, value]));
  result.faces[0].material = material;
  return result;
};

test('negative modifies configuration values, decays only facing up and resets with battle cleanup', () => {
  const pool = [die('a', 'food', 4, 'negative'), die('b', 'food', 4, 'negative')];
  assert.equal(getEffectiveFace(pool[0].faces[0]).baseValue, 9);
  let current = pool;
  const values = [];
  for (let i = 0; i < 7; i++) {
    values.push(getEffectiveFace(current[0].faces[0]).baseValue);
    current = commitMaterialRound(current, [0, 1]);
  }
  assert.deepEqual(values, [9, 7, 5, 3, 1, 0, 0]);
  assert.equal(getEffectiveFace(current[1].faces[0]).baseValue, 9);
});

test('imposter locks food immediately, keeps identity across rerolls and creates no virtual entity', () => {
  const pool = [die('a', 'imposter'), die('b', 'food')];
  const roll = performStartBattleRoll(pool, [], undefined, undefined, 0, () => 0);
  assert.equal(roll.comboSummary.items[0].creature, 'food');
  assert.equal(roll.creatureBattleState.imposterTargets.a, 'food');
  pool[1].faces[1].creature = 'priest';
  const step = resolveRerollChain(pool, [0, 0], roll.creatureBattleState, 1, [], () => 0)[0];
  assert.equal(calculateRollResolution(pool, step.rolledIndices, [], step.state).items[0].creature, 'food');
});

test('imposter priest witnesses rerolls immediately and retains its own source', () => {
  const pool = [die('a', 'imposter'), die('b', 'priest'), die('c', 'food')];
  pool[2].faces[0].creature = 'priest';
  const roll = performStartBattleRoll(pool, [], undefined, undefined, 0, () => 0);
  const step = resolveRerollChain(pool, [0, 0, 0], roll.creatureBattleState, 2, [], () => 0)[0];
  const result = calculateRollResolution(pool, step.rolledIndices, [], step.state);
  assert.equal(result.bonusDice.filter((b) => b.source.kind === 'creature' && b.source.diceId === 'a')[0].bonusDamage, 2);
});

test('shared storage admits leftmost food first and iridescent characters count as food', () => {
  const pool = [die('a', 'warrior', 8, 'iridescent'), die('b', 'food', 8)];
  pool.forEach((d) => { d.faces[1].creature = 'chef'; });
  const state = createCreatureBattleState(); state.storedFood = { a: 147 };
  const result = calculateRollResolution(pool, [0, 0], [], state);
  assert.deepEqual(result.nextStoredFood, { a: 150 });
  assert.equal(result.items[1].finalDamage, 8);
});

test('ripple contributes to bulwark and shock contributes to herald', () => {
  const pool = [die('a', 'bulwark', 4, 'ripple'), die('b', 'herald', 4, 'shock')];
  const result = calculateRollResolution(pool, [0, 0], []);
  assert.deepEqual(result.bonusDice.map((b) => b.bonusDamage).sort(), [2, 4]);
  assert.equal(result.totalShield, 4);
  assert.equal(result.items[0].finalDamage, 6);
});

test('echo duplicates the whole gang ability once, while previews remain pure', () => {
  const pool = [die('a', 'gang', 4, 'echo')];
  const state = createCreatureBattleState();
  const first = calculateRollResolution(pool, [0], [], state);
  assert.equal(first.bonusDice.length, 8);
  assert.deepEqual(first, calculateRollResolution(pool, [0], [], state));
  assert.deepEqual(state.echoUsed, []);
  const second = calculateRollResolution(pool, [0], [], { ...state, echoUsed: first.nextEchoUsed });
  assert.equal(second.bonusDice.length, 4);
});

test('all-imposter board locks the original identity for the whole round', () => {
  const pool = [die('a', 'imposter'), die('b', 'imposter')];
  const first = performStartBattleRoll(pool, [], undefined, undefined, 0, () => 0);
  pool[1].faces[1].creature = 'food';
  const step = resolveRerollChain(pool, [0, 0], first.creatureBattleState, 1, [], () => 0)[0];
  assert.equal(calculateRollResolution(pool, step.rolledIndices, [], step.state).items[0].creature, 'imposter');
  const next = performStartBattleRoll(pool, [], step.state, undefined, 0, () => 0.2);
  assert.equal(next.comboSummary.items[0].creature, 'food');
});

test('imposter preserves its base and material and reuses the first identity after returning', () => {
  const pool = [die('a', 'imposter', 4, 'foil'), die('b', 'sisters', 30)];
  pool[0].faces[1].creature = 'food';
  const first = performStartBattleRoll(pool, [], undefined, undefined, 0, () => 0);
  assert.equal(first.comboSummary.items[0].baseValue, 7);
  assert.equal(first.comboSummary.items[0].material, 'foil');
  const left = resolveRerollChain(pool, [0, 0], first.creatureBattleState, 0, [], () => 0)[0];
  pool[1].faces[0].creature = 'priest';
  const back = resolveRerollChain(pool, left.rolledIndices, left.state, 0, [], () => 0)[0];
  assert.equal(calculateRollResolution(pool, back.rolledIndices, [], back.state).items[0].creature, 'sisters');
});

test('resonance stacks on facing neighbors, foil is readable by followers and negative remains nonnegative', () => {
  const pool = [die('a', 'food', 4, 'resonance'), die('b', 'food'), die('c', 'food', 4, 'resonance')];
  assert.deepEqual(calculateRollResolution(pool, [0, 0, 0], []).items.map((i) => i.baseValue), [4, 8, 4]);
  const warrior = die('w', 'warrior', 4, 'foil');
  const follower = die('f', 'follower');
  assert.equal(calculateRollResolution([warrior, follower], [1, 0], []).items[1].finalDamage, 11);
});

test('storage caps virtual food too and supports underground capacity', () => {
  const pool = [die('a', 'food', 8), die('b', 'food', 8)];
  pool.forEach((d) => { d.faces[1].creature = 'chef'; });
  const state = createCreatureBattleState(); state.storedFood.a = 190; state.virtualFood = 5;
  const result = calculateRollResolution(pool, [0, 0], [], state, { control: 0, maxControl: 3, gold: 0, foodCapacity: 200 });
  assert.deepEqual(result.nextStoredFood, { a: 200 });
});

test('echo chef spends food once and repeats the full additional attack', () => {
  const pool = [die('a', 'chef', 4, 'echo')];
  const state = createCreatureBattleState(); state.storedFood.a = 20;
  const result = calculateRollResolution(pool, [0], [], state);
  assert.deepEqual(result.bonusDice.map((b) => b.bonusDamage), [20, 20]);
  assert.equal(result.nextStoredFood.a, 0);
});

test('retained priest earnings cannot consume a different face echo', () => {
  const pool = [die('a', 'priest'), die('b', 'food')];
  pool[0].faces[1] = { ...pool[0].faces[1], creature: 'food', material: 'echo' };
  const step = resolveRerollChain(pool, [0, 0], createCreatureBattleState(), 0, [], () => 0)[0];
  const result = calculateRollResolution(pool, step.rolledIndices, [], step.state);
  assert.equal(result.bonusDice.length, 1);
  assert.deepEqual(result.nextEchoUsed, []);
  assert.equal(result.bonusDice[0].source.kind === 'creature' && result.bonusDice[0].source.faceId, pool[0].faces[0].id);
});

test('echo priest retains ownership and echoes after being rerolled away', () => {
  const pool = [die('a', 'priest', 4, 'echo')]; pool[0].faces[1].creature = 'food';
  const step = resolveRerollChain(pool, [0], createCreatureBattleState(), 0, [], () => 0)[0];
  const result = calculateRollResolution(pool, step.rolledIndices, [], step.state);
  assert.deepEqual(result.bonusDice.map((b) => b.bonusDamage), [2, 2]);
  assert.deepEqual(result.nextEchoUsed, [pool[0].faces[0].id]);
});

test('echo teacher provides a second choice but later rounds do not refresh echo', () => {
  const pool = [die('a', 'teacher', 10, 'echo'), die('b', 'food', 1), die('c', 'family', 2)];
  const first = performStartBattleRoll(pool, [], undefined, undefined, 0, () => 0);
  const once = resolveRerollChain(pool, [0, 0, 0], first.creatureBattleState, 2, [], () => 0, 'a')[0];
  assert.deepEqual(once.state.teachersAvailable, ['a']);
  const twice = resolveRerollChain(pool, once.rolledIndices, once.state, 2, [], () => 0, 'a')[0];
  assert.deepEqual(twice.state.teachersAvailable, []);
  const next = performStartBattleRoll(pool, [], twice.state, undefined, 0, () => 0);
  const third = resolveRerollChain(pool, next.rolledIndices, next.creatureBattleState, 2, [], () => 0, 'a')[0];
  assert.deepEqual(third.state.teachersAvailable, []);
});

test('echo prankster fires one extra neighbor reroll and coward shield doubles only once', () => {
  const pool = [die('a', 'prankster', 4, 'echo'), die('b', 'coward', 4, 'echo')];
  const steps = resolveRerollChain(pool, [0, 0], createCreatureBattleState(), 0, [], () => 0);
  assert.equal(steps.length, 3);
  assert.equal(steps.at(-1)!.state.cowardShields.b, 8);
  assert.equal(calculateRollResolution(pool, steps.at(-1)!.rolledIndices, [], steps.at(-1)!.state).totalShield, 8);
});

test('iridescent tags survive authority and contribute each tag only once', () => {
  const pool = [die('a', 'family', 4, 'iridescent'), die('b', 'authority'), die('c', 'guard')];
  const result = calculateRollResolution(pool, [0, 0, 0], []);
  assert.equal(result.items[0].tags.length, 6);
  assert.equal(result.items[2].shieldGranted, 4);
});

test('echo farmer doubles base and attack boost before storage, and echo herald buffs the full team', () => {
  const pool = [die('a', 'farmer', 4, 'echo'), die('b', 'food')]; pool[1].faces[1].creature = 'chef';
  const result = calculateRollResolution(pool, [0, 0], []);
  assert.equal(result.items[1].baseValue, 10);
  assert.equal(result.items[1].finalDamage, 10);
  assert.equal(result.nextStoredFood.b, 10);
  const team = [die('a', 'herald', 4, 'echo'), die('b', 'food', 4, 'shock')];
  assert.deepEqual(calculateRollResolution(team, [0, 0], []).items.map((i) => i.finalDamage), [6, 6]);
});

test('echo princess repeats commands, gold faces are recorded once and hidden materials stay inactive', () => {
  const pool = [die('a', 'princess', 0, 'echo'), die('b', 'priest', 4, 'gilded')];
  const first = calculateRollResolution(pool, [0, 0], []);
  assert.equal(first.repeatAttacks.length, 2);
  const second = calculateRollResolution(pool, [0, 0], [], { ...createCreatureBattleState(), gildedFaces: first.nextGildedFaces, echoUsed: first.nextEchoUsed });
  assert.deepEqual(second.nextGildedFaces, [pool[1].faces[0].id]);
  assert.equal(second.repeatAttacks.length, 1);
  assert.deepEqual(calculateRollResolution(pool, [1, 1], []).nextGildedFaces, []);
});
