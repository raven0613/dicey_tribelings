import { CREATURE_BALANCE } from '../../../configs/creatures/creatureBalanceConfig';
import assert from 'node:assert/strict';
import test from 'node:test';
import { configuredDice } from '../../dice/diceFactory';
import { getEffectiveFace } from '../../dice/diceFaces';
import { calculateRollResolution } from '../battleEngine';
import { createCreatureBattleState } from './creatureState';
import { ALL_EQUIPMENT_CATALOG } from '../../../configs/equipment/equipmentConfig';
import { refreshImposterTargets, getRoundFace } from './imposterResolution';
import { findTeacherTargets } from './rerollTargets';
import { performDiceAction, getOppositeFace, performStartBattleRoll } from '../rollService';
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

test('imposter selects local food immediately and preserves unchanged candidates across rerolls', () => {
  const pool = [die('a', 'imposter'), die('b', 'food')];
  pool[0].faces[2].creature = 'food'; pool[0].faces[3].creature = 'food';
  const roll = performStartBattleRoll(pool, [], undefined, undefined, 0, () => 0);
  assert.equal(roll.comboSummary.items[0].creature, 'food');
  assert.equal(roll.creatureBattleState.imposterTargets.a, 'food');
  pool[1].faces[1].creature = 'priest';
  const step = resolveRerollChain(pool, [0, 0], roll.creatureBattleState, 1, [], () => 0)[0];
  assert.equal(calculateRollResolution(pool, step.rolledIndices, [], step.state).items[0].creature, 'food');
});

test('imposter priest uses only the altar belonging to its own die', () => {
  const pool = [die('a', 'imposter'), die('b', 'priest'), die('c', 'priest')];
  pool[0].faces[1].creature = 'priest';
  const roll = performStartBattleRoll(pool, [], undefined, undefined, 0, () => 0);
  const other = resolveRerollChain(pool, [0, 0, 0], roll.creatureBattleState, 1, [], () => 0)[0];
  assert.equal(calculateRollResolution(pool, other.rolledIndices, [], other.state).bonusDice.filter((bonus) => bonus.source.kind === 'creature' && bonus.source.diceId === 'a').length, 0);
  const own = resolveRerollChain(pool, other.rolledIndices, other.state, 0, [], () => 0.2)[0];
  const result = calculateRollResolution(pool, own.rolledIndices, [], own.state);
  assert.equal(result.bonusDice.find((bonus) => bonus.source.kind === 'creature' && bonus.source.diceId === 'a')!.bonusDamage, pool[0].faces[0].baseValue);
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
  assert.deepEqual(result.bonusDice.map((b) => b.bonusDamage).sort(), [3, 9]);
  assert.equal(result.totalShield, 4);
  assert.equal(result.items[0].finalDamage, 6);
});

test('echo duplicates the whole gang ability once, while previews remain pure', () => {
  const pool = [die('a', 'gang', 4, 'echo')];
  const state = createCreatureBattleState();
  const first = calculateRollResolution(pool, [0], [], state);
  assert.equal(first.bonusDice.length, 4 * 2);
  assert.deepEqual(first, calculateRollResolution(pool, [0], [], state));
  assert.deepEqual(state.echoUsed, []);
  const second = calculateRollResolution(pool, [0], [], { ...state, echoUsed: first.nextEchoUsed });
  assert.equal(second.bonusDice.length, 4);
});

test('imposters stay themselves when both board and own die lack a majority', () => {
  const pool = [die('a', 'imposter'), die('b', 'imposter')];
  const first = performStartBattleRoll(pool, [], undefined, undefined, 0, () => 0);
  pool[1].faces[1].creature = 'food';
  const step = resolveRerollChain(pool, [0, 0], first.creatureBattleState, 1, [], () => 0)[0];
  assert.equal(calculateRollResolution(pool, step.rolledIndices, [], step.state).items[0].creature, 'imposter');
  const next = performStartBattleRoll(pool, [], step.state, undefined, 0, () => 0.2);
  assert.equal(next.comboSummary.items[0].creature, 'imposter');
});

test('imposter preserves its base and material when returning to the same local majority', () => {
  const pool = [die('a', 'imposter', 4, 'foil'), die('b', 'sisters', 30)];
  pool[0].faces[1].creature = 'food';
  pool[0].faces[2].creature = 'sisters'; pool[0].faces[3].creature = 'sisters';
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
  assert.deepEqual(calculateRollResolution(pool, [0, 0, 0], []).items.map((i) => i.finalDamage), [4, 8, 4]);
  const warrior = die('w', 'warrior', 4, 'foil');
  const follower = die('f', 'follower');
  const result = calculateRollResolution([warrior, follower], [0, 0], []);
  assert.equal(result.items[1].finalDamage, follower.faces[0].baseValue + result.items[0].finalDamage * (CREATURE_BALANCE.follower.fraction + (follower.faces.length - 1) * CREATURE_BALANCE.follower.perFace));
});

test('food deposits respect the underground storage capacity', () => {
  const pool = [die('a', 'food', 8), die('b', 'food', 8)];
  pool.forEach((d) => { d.faces[1].creature = 'chef'; });
  const state = createCreatureBattleState(); state.storedFood.a = 190;
  const result = calculateRollResolution(pool, [0, 0], [], state, { control: 0, maxControl: 3, gold: 0, foodCapacity: 200 });
  assert.deepEqual(result.nextStoredFood, { a: 200 });
});

test('echo chef spends food once and repeats the full additional attack', () => {
  const pool = [die('a', 'chef', 4, 'echo')];
  const state = createCreatureBattleState(); state.storedFood.a = 20;
  const result = calculateRollResolution(pool, [0], [], state);
  assert.deepEqual(result.bonusDice.map((b) => b.bonusDamage), [4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3]);
  assert.equal(result.nextStoredFood.a, 0);
});

test('unreleased altar neither attacks nor consumes the facing food echo', () => {
  const pool = [die('a', 'priest'), die('b', 'food')];
  pool[0].faces[1] = { ...pool[0].faces[1], creature: 'food', material: 'echo' };
  const initial = performStartBattleRoll(pool, [], undefined, undefined, 0, () => 0);
  const step = resolveRerollChain(pool, [0, 0], initial.creatureBattleState, 0, [], () => 0)[0];
  const result = calculateRollResolution(pool, step.rolledIndices, [], step.state);
  assert.equal(result.bonusDice.length, 0);
  assert.equal(result.nextAltars.a, 1);
  assert.deepEqual(result.nextEchoUsed, []);
});

test('echo priest releases once after returning, doubles the ability and clears its altar', () => {
  const pool = [die('a', 'priest', 4, 'echo')]; pool[0].faces[1].creature = 'food';
  const initial = performStartBattleRoll(pool, [], undefined, undefined, 0, () => 0);
  const away = resolveRerollChain(pool, [0], initial.creatureBattleState, 0, [], () => 0)[0];
  const back = resolveRerollChain(pool, away.rolledIndices, away.state, 0, [], () => 0)[0];
  const result = calculateRollResolution(pool, back.rolledIndices, [], back.state);
  assert.deepEqual(result.bonusDice.map((bonus) => bonus.bonusDamage), Array(2 * back.state.altars.a).fill(pool[0].faces[0].baseValue));
  assert.deepEqual(result.nextEchoUsed, [pool[0].faces[0].id]);
  assert.equal(result.nextAltars.a, 0);
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
  assert.equal(result.items[2].shieldGranted, 2 * pool[2].faces.length);
});

test('echo farmer doubles food and attack boost while preserving base attacks, and echo herald buffs the full team', () => {
  const pool = [die('a', 'farmer', 4, 'echo'), die('b', 'food')]; pool[1].faces[1].creature = 'chef';
  const result = calculateRollResolution(pool, [0, 0], []);
  assert.equal(result.items[1].baseValue, pool[1].faces[0].baseValue);
  assert.equal(result.items[1].finalDamage, 4 + pool[0].faces.length * 2);
  assert.equal(result.nextStoredFood.b, result.items[1].finalDamage * CREATURE_BALANCE.food.storageMultiplier + CREATURE_BALANCE.chef.storagePerFace);
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


test('other dice rerolls update all imposters together and lost board majorities fall back to each own die', () => {
  const pool = [die('a', 'imposter'), die('b', 'imposter'), die('c', 'porter'), die('d', 'guard')];
  pool[0].faces[1].creature = 'guard'; pool[0].faces[2].creature = 'guard';
  pool[3].faces[1].creature = 'porter';
  const first = performStartBattleRoll(pool, [], undefined, undefined, 0, () => 0);
  assert.deepEqual(first.creatureBattleState.imposterTargets, { a: 'guard', b: 'imposter' });
  const joined = resolveRerollChain(pool, first.rolledIndices, first.creatureBattleState, 3, [], () => 0)[0];
  assert.deepEqual(joined.state.imposterTargets, { a: 'porter', b: 'porter' });
  const result = calculateRollResolution(pool, joined.rolledIndices, [], joined.state);
  assert.ok(result.items.every(item => item.creature === 'porter'));
  assert.ok(result.events.some(event => event.skill === 'porter' && event.activated));
  const fallback = resolveRerollChain(pool, joined.rolledIndices, joined.state, 3, [], () => 0)[0];
  assert.deepEqual(fallback.state.imposterTargets, { a: 'guard', b: 'imposter' });
  assert.equal(fallback.state.rerollCount, 2);
  assert.deepEqual(fallback.state.faceVersions, { d: 2 });
  assert.deepEqual(fallback.state.cowardShields, {});
  assert.deepEqual(fallback.state.prankstersUsed, []);
  assert.deepEqual(fallback.state.echoUsed, []);
  assert.deepEqual(result, calculateRollResolution(pool, joined.rolledIndices, [], joined.state));
});

test('new tied candidates take part in a fresh choice while unchanged candidates preserve it', () => {
  const pool = [die('a', 'imposter'), die('b', 'porter'), die('c', 'porter'), die('d', 'guard'), die('e', 'food')];
  pool[4].faces[1].creature = 'guard';
  const seen = new Set<CreatureId>();
  for (let seed = 1; seed <= 32; seed++) {
    const state = refreshImposterTargets(pool, [0, 0, 0, 0, 0], createCreatureBattleState(seed));
    assert.equal(state.imposterTargets.a, 'porter');
    const step = resolveRerollChain(pool, [0, 0, 0, 0, 0], state, 4, [], () => 0)[0];
    seen.add(step.state.imposterTargets.a);
    const changedSeed = { ...step.state, seed: seed + 1 };
    const same = resolveRerollChain(pool, step.rolledIndices, changedSeed, 1, [], () => 0)[0];
    assert.equal(same.state.imposterTargets.a, step.state.imposterTargets.a);
    const reordered = refreshImposterTargets([...pool].reverse(), [...step.rolledIndices].reverse(), changedSeed);
    assert.equal(reordered.imposterTargets.a, step.state.imposterTargets.a);
  }
  assert.deepEqual(seen, new Set(['porter', 'guard']));
});

test('flip refreshes imposter majority without creating reroll effects', () => {
  const pool = [die('a', 'imposter'), die('b', 'porter'), die('c', 'porter')];
  pool[0].faces[1].creature = 'food'; pool[0].faces[2].creature = 'food';
  pool[2].faces[getOppositeFace(pool[2], 0)!].creature = 'guard';
  const first = performStartBattleRoll(pool, [], undefined, undefined, 0, () => 0);
  assert.equal(first.creatureBattleState.imposterTargets.a, 'porter');
  const flipped = performDiceAction('flip', 2, { ...first, dicePool: pool, equipments: ALL_EQUIPMENT_CATALOG,
    control: 3, maxControl: 3, gold: 0, combatPhase: 'CONTROL_PHASE' })!;
  assert.equal(flipped.creatureBattleState.imposterTargets.a, 'food');
  assert.equal(flipped.creatureBattleState.rerollCount, 0);
  assert.deepEqual(flipped.creatureBattleState.rerolledDice, []);
});

test('dynamic teacher identity preserves only unused initial eligibility', () => {
  const pool = [die('a', 'imposter'), die('b', 'teacher'), die('c', 'teacher')];
  pool[0].faces[1].creature = 'food'; pool[0].faces[2].creature = 'food';
  pool[2].faces[1].creature = 'guard';
  const first = performStartBattleRoll(pool, [], undefined, undefined, 0, () => 0);
  const targets = (indices: number[], state: typeof first.creatureBattleState) => findTeacherTargets(
    pool.map((d, i) => ({ ...getRoundFace(d, indices[i], state), diceId: d.id })), state, 'a');
  assert.ok(targets(first.rolledIndices, first.creatureBattleState).length > 0);
  const away = resolveRerollChain(pool, first.rolledIndices, first.creatureBattleState, 2, [], () => 0)[0];
  assert.equal(away.state.imposterTargets.a, 'food');
  assert.deepEqual(targets(away.rolledIndices, away.state), []);
  const back = resolveRerollChain(pool, away.rolledIndices, away.state, 2, [], () => 0)[0];
  assert.ok(targets(back.rolledIndices, back.state).length > 0);
  const used = resolveRerollChain(pool, back.rolledIndices, back.state, 1, [], () => 0, 'a')[0];
  const againAway = resolveRerollChain(pool, used.rolledIndices, used.state, 2, [], () => 0)[0];
  const againBack = resolveRerollChain(pool, againAway.rolledIndices, againAway.state, 2, [], () => 0)[0];
  assert.equal(againBack.state.imposterTargets.a, 'teacher');
  assert.deepEqual(targets(againBack.rolledIndices, againBack.state), []);
});
