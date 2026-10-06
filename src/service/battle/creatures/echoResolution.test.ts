import assert from 'node:assert/strict';
import test from 'node:test';
import { die, resolve, faceIndex } from './testFixtures';
import { createCreatureBattleState } from './creatureState';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { FOOD_CAPACITY } from '../../../configs/materials/materialConfig';

test('echo food repeats storage once within shared capacity and previews are pure', () => {
  const food = die('f', { 1: 'food', 2: 'chef' }); food.faces[0].material = 'echo';
  const state = createCreatureBattleState();
  const first = resolve([food], undefined, [], state);
  assert.equal(first.nextStoredFood.f, 2 * (b.food.storageMultiplier + b.chef.storagePerFace));
  assert.deepEqual(state.echoUsed, []);
  const next = resolve([food], undefined, [], { ...state, echoUsed: first.nextEchoUsed });
  assert.equal(next.nextStoredFood.f, b.food.storageMultiplier + b.chef.storagePerFace);
  const capped = resolve([food], undefined, [], { ...state, storedFood: { f: FOOD_CAPACITY.crocodile - 1 } });
  assert.equal(capped.nextStoredFood.f, FOOD_CAPACITY.crocodile);
});
test('authority echo keeps common tags and repeats the same pre-coronation gain', () => {
  const authority = die('a', { 1: 'authority' }); authority.faces[0].material = 'echo';
  const pool = [die('l', { 1: 'family' }), authority, die('r', { 1: 'family' }), die('p', { 1: 'priest' })];
  const result = resolve(pool);
  for (const index of [0, 2]) {
    assert.deepEqual(result.items[index].tags, ['common', 'noble']);
    assert.equal(result.items[index].finalDamage, 1 + b.family.bonusPerFace + 2 * b.authority.bonusPerNoble);
  }
});
test('chef echo doubles released dice while consuming and refunding food once', () => {
  const chef = die('c', { 1: 'chef', 2: 'chef', 3: 'chef' }); chef.faces[0].material = 'echo';
  const result = resolve([chef], undefined, [], { ...createCreatureBattleState(), storedFood: { c: 10 } });
  assert.equal(result.bonusDice.length, 6);
  assert.equal(result.bonusDice.reduce((sum, bonus) => sum + bonus.bonusDamage, 0), 20);
  assert.equal(result.nextStoredFood.c, 0);
});
test('echo cheer copies each actual delivered gain once per activation', () => {
  const cheer = die('c', { 1: 'cheerleader' }); cheer.faces[0].material = 'echo';
  const result = resolve([cheer, die('g', { 1: 'royalGuard', 2: 'elder' })]);
  assert.equal(result.items[1].finalDamage, 5);
  assert.deepEqual(result.bonusDice.map(bonus => bonus.bonusDamage), [2, 2]);
});
test('face echo is consumed only when its current ability resolves', () => {
  const priest = die('p', { 1: 'priest', 2: 'blank' }); priest.faces[faceIndex(1)].material = 'echo';
  const state = { ...createCreatureBattleState(), altars: { p: 2 } };
  const hidden = resolve([priest], [2], [], state);
  assert.deepEqual(hidden.nextEchoUsed, []); assert.equal(hidden.nextAltars.p, 2);
  const released = resolve([priest], [1], [], state);
  assert.equal(released.bonusDice.length, 4); assert.equal(released.nextAltars.p, 0);
});
