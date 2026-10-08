import assert from 'node:assert/strict';
import test from 'node:test';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { EQUIPMENT_BALANCE } from '../../../configs/equipment/equipmentConfig';
import { MATERIAL_BALANCE } from '../../../configs/materials/materialConfig';
import { createCreatureBattleState } from './creatureState';
import { die, resolve, faceIndex } from './testFixtures';

test('sisters amplify a received buff only for other facing sisters, regardless of distance', () => {
  const pool = [
    die('source', { 1: 'sisters' }),
    die('fruit', { 1: 'fruit' }),
    die('blank', {}),
    die('recipient', { 1: 'sisters' }),
  ];
  const result = resolve(pool);
  assert.deepEqual(
    result.items.map((item) => item.finalDamage),
    [1 + b.fruit.bonus, 1, 1 + b.fruit.bonus, 1 + b.fruit.bonus * b.sisters.shareMultiplier],
  );
});

test('face-down sisters and additional sisters on the same die add no shares', () => {
  const result = resolve([
    die('source', { 1: 'sisters', 2: 'sisters', 3: 'sisters' }),
    die('fruit', { 1: 'fruit' }),
    die('hidden', { 2: 'sisters' }),
  ]);
  assert.deepEqual(
    result.items.map((item) => item.finalDamage),
    [1 + b.fruit.bonus, 1, 1 + b.fruit.bonus],
  );
  assert.equal(result.events.filter((event) => event.skill === 'sisters').length, 0);
});

test('material base increases remain local and do not initiate sister sharing', () => {
  const source = die('source', { 1: 'sisters' });
  source.faces[faceIndex(1)].material = 'foil';
  const result = resolve([source, die('recipient', { 1: 'sisters' })]);
  assert.deepEqual(
    result.items.map((item) => item.finalDamage),
    [1 + MATERIAL_BALANCE.foil, 1],
  );
});

test('equipment gains on each sister share their original amount once', () => {
  const pip = 6;
  const pool = ['a', 'b', 'c'].map((id) => die(id, { [pip]: 'sisters' }));
  const result = resolve(
    pool,
    pool.map(() => pip),
    ['SLOTS'],
  );
  const gain = pip * (EQUIPMENT_BALANCE.matchedMultiplier - 1);
  const expected = pip + gain * (1 + (pool.length - 1) * b.sisters.shareMultiplier);
  assert.deepEqual(
    result.items.map((item) => item.finalDamage),
    pool.map(() => expected),
  );
  assert.equal(result.events.filter((event) => event.skill === 'sisters').length, pool.length);
});

test('echo repeats amplified sharing once and keeps the original buff and preview state intact', () => {
  const source = die('source', { 1: 'sisters' });
  source.faces[faceIndex(1)].material = 'echo';
  const pool = [
    source,
    die('fruit', { 1: 'fruit' }),
    die('blank', {}),
    die('recipient', { 1: 'sisters' }),
  ];
  const state = createCreatureBattleState();
  const first = resolve(pool, undefined, [], state);
  assert.equal(first.items[0].finalDamage, 1 + b.fruit.bonus);
  assert.equal(first.items[3].finalDamage, 1 + b.fruit.bonus * b.sisters.shareMultiplier * 2);
  assert.deepEqual(state.echoUsed, []);
  assert.deepEqual(resolve(pool, undefined, [], state), first);
  const next = resolve(pool, undefined, [], { ...state, echoUsed: first.nextEchoUsed });
  assert.equal(next.items[3].finalDamage, 1 + b.fruit.bonus * b.sisters.shareMultiplier);
});
