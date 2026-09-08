import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateRollResolution } from '../battleEngine';
import { configuredDice } from '../../dice/diceFactory';
import { createCreatureBattleState } from './creatureState';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { ALL_EQUIPMENT_CATALOG } from '../../../configs/equipment/equipmentConfig';
import type { CreatureId } from '../../../types/creatures';

const die = (id: string, creature: CreatureId, value = 4) => configuredDice(id, id, 'd6', 'amber',
  Array.from({ length: 6 }, () => [creature, value] as [CreatureId, number]));
const resolve = (pool: ReturnType<typeof die>[]) => calculateRollResolution(pool, pool.map(() => 0), []);

test('family reads other effective faces and twins use the highest effective base', () => {
  const family = die('a', 'family');
  family.faces[1].temporarySticker = { name: '覆蓋', creature: 'twins', description: '' };
  const twins = die('b', 'twins', 2);
  twins.faces[5].baseValue = 9;
  const result = resolve([family, twins]);
  assert.equal(result.items[0].finalDamage, 4 + 4 * b.family.bonus);
  assert.equal(result.items[1].baseValue, 9);
  assert.equal(result.items[1].finalDamage, 9);
});

test('porters retain every attack and only multiply the tail base by chain length', () => {
  const result = resolve([die('a', 'porter', 1), die('b', 'porter', 1), die('c', 'porter', 10)]);
  assert.deepEqual(result.items.map((item) => item.finalDamage), [1, 1, 30]);
  assert.equal(result.totalDamage, 32);
});

test('farmers transform simultaneously and chefs accumulate without consuming food or mutating previews', () => {
  const farmer = die('a', 'farmer', 4);
  farmer.faces[1].creature = 'chef';
  const state = createCreatureBattleState();
  state.storedFood.a = 7;
  const pool = [farmer, die('b', 'farmer', 3), die('c', 'glutton', 5)];
  const result = calculateRollResolution(pool, [0, 0, 0], [], state);
  assert.deepEqual(result.items.slice(0, 2).map((item) => item.creature), ['food', 'food']);
  assert.equal(result.nextStoredFood.a, 11);
  assert.equal(result.items[0].finalDamage, 4);
  assert.equal(result.items[2].finalDamage, 15);
  assert.equal(state.storedFood.a, 7);
  assert.deepEqual(result, calculateRollResolution(pool, [0, 0, 0], [], state));
  const released = calculateRollResolution(pool, [1, 0, 0], [], { ...state, storedFood: result.nextStoredFood });
  assert.equal(released.nextStoredFood.a, 0);
  assert.equal(released.bonusDice.find((bonus) => bonus.source.kind === 'creature' && bonus.source.diceId === 'a')?.bonusDamage, 11);
});

test('boss steals current supported damage once, preserving gang additions', () => {
  const result = resolve([die('a', 'boss'), die('b', 'gang', 10)]);
  assert.equal(result.items[0].finalDamage, 4 + 10 * b.boss.multiplier);
  assert.equal(result.items[1].finalDamage, 0);
  assert.deepEqual(result.bonusDice.map((bonus) => bonus.bonusDamage), Array(4).fill(b.gang.damagePerNeighbor));
});

test('bosses can steal each other but each target is marked once', () => {
  const result = resolve([die('a', 'boss'), die('b', 'boss'), die('c', 'boss')]);
  const stolen = result.events.filter((event) => event.ability === '現在是我的了')
    .flatMap((event) => event.changes.filter((change) => change.after === 0).map((change) => change.targetId));
  assert.equal(new Set(stolen).size, stolen.length);
  assert.ok(stolen.length > 0);
});

test('bully removes half from craftsman but gains double the removed amount', () => {
  const result = resolve([die('a', 'bully', 4), die('b', 'porter', 10)]);
  assert.deepEqual(result.items.map((item) => item.finalDamage), [14, 5]);
});

test('thief loses bonus only when robbery zeroed its attack', () => {
  assert.equal(resolve([die('a', 'boss'), die('b', 'thief')]).bonusDice.length, 0);
  assert.equal(resolve([die('a', 'bully'), die('b', 'thief')]).bonusDice.length, 1);
});

test('multiple bulwarks read the same newly granted shield and heralds affect normal dice only', () => {
  const result = resolve([die('a', 'guard'), die('b', 'family'), die('c', 'bulwark'), die('d', 'bulwark'), die('e', 'herald')]);
  assert.equal(result.totalShield, b.guard.shield);
  assert.deepEqual(result.bonusDice.map((bonus) => bonus.bonusDamage), [b.guard.shield, b.guard.shield]);
  assert.equal(result.items[0].finalDamage, 4 + 2 * b.herald.bonusPerAttack);
});

test('princesses can gain herald damage and order each other without recursive skills', () => {
  const result = resolve([die('a', 'princess'), die('b', 'princess'), die('c', 'gang'), die('d', 'herald')]);
  assert.deepEqual(result.items.slice(0, 2).map((item) => item.finalDamage), [4, 4].map((count) => count * b.herald.bonusPerAttack));
  assert.equal(result.repeatAttacks.length, 2);
  assert.equal(result.bonusDice.length, 4);
  assert.equal(result.totalDamage, result.items.reduce((sum, item) => sum + item.finalDamage, 0)
    + 4 * b.gang.damagePerNeighbor + 8 * b.herald.bonusPerAttack);
});

test('imposter supplies counts without abilities or extra physical attacks', () => {
  const result = resolve([die('a', 'sisters'), die('b', 'imposter'), die('c', 'imposter')]);
  assert.equal(result.items.length, 3);
  assert.equal(result.repeatAttacks.length, 0);
  assert.equal(result.bonusDice.length, 0);
});

test('every damage change event has a continuous before/after chain ending at the preview', () => {
  const result = resolve([die('a', 'sisters'), die('b', 'sisters'), die('c', 'boss'), die('d', 'thief'), die('e', 'herald')]);
  const values = Object.fromEntries(result.items.map((item) => [item.diceId, item.rolledBaseValue]));
  for (const event of result.events) for (const change of event.changes) {
    if (change.kind !== 'attack') continue;
    assert.equal(change.before, values[change.targetId]);
    values[change.targetId] = change.after;
  }
  for (const item of result.items) assert.equal(values[item.diceId], item.finalDamage);
  assert.ok(result.events.every((event, index) => index === 0 || event.stage >= result.events[index - 1].stage));
});

test('equipment bonuses are applied before princess snapshots and never replay abilities', () => {
  const equipment = ALL_EQUIPMENT_CATALOG.filter((item) => ['RESERVE', 'RESONATOR'].includes(item.ruleId));
  const pool = [die('a', 'princess'), die('b', 'elder'), die('c', 'gang')];
  const result = calculateRollResolution(pool, [0, 0, 0], equipment, createCreatureBattleState(), { control: 3, maxControl: 3, gold: 0 });
  assert.equal(result.repeatAttacks[0].damage, result.items[1].finalDamage);
  assert.equal(result.bonusDice.length, 4);
});

test('farmers concentrate fixed boosts on nearest food and storage reads strengthened bases', () => {
  const foods = Array.from({ length: 7 }, (_, index) => {
    const food = die(`food-${index}`, 'food', 4);
    food.faces[1].creature = 'chef';
    return food;
  });
  const result = resolve([...foods, die('farmer-a', 'farmer'), die('farmer-b', 'farmer')]);
  assert.equal(Math.round(result.items.slice(0, 7).reduce((sum, item) => sum + item.baseValue, 0) * 100),
    (7 * 4 + b.farmer.foodBonus * 2) * 100);
  for (const food of result.items.slice(0, 7)) assert.equal(result.nextStoredFood[food.diceId], food.baseValue);
});

test('warriors count neighboring follower faces and followers read effective neighboring warrior bases', () => {
  const warrior = die('a', 'warrior', 6);
  warrior.faces[1].creature = 'follower';
  warrior.faces[2].baseValue = 20;
  warrior.faces[2].temporarySticker = { name: '勇士', creature: 'warrior', description: '' };
  const result = resolve([warrior, die('b', 'follower', 3)]);
  assert.equal(result.items[0].finalDamage, 6 + 6 * b.warrior.bonusPerFollower);
  assert.equal(result.items[1].finalDamage, 23);
});

test('face-up artisan grants shields from adjacent craftsman faces', () => {
  const artisan = die('b', 'artisan');
  const result = resolve([die('a', 'food'), artisan, die('c', 'imposter')]);
  assert.equal(result.items[1].shieldGranted, 4 * b.artisan.shield);
});

test('imposter count supports sister threshold and identifies its actual participating die', () => {
  const pool = [die('a', 'sisters'), die('b', 'imposter')];
  let found = false;
  for (let seed = 0; seed < 20; seed++) {
    const result = calculateRollResolution(pool, [0, 0], [], { ...createCreatureBattleState(), seed });
    if (result.items[0].finalDamage === 4 + b.sisters.bonus) {
      found = true;
      assert.deepEqual(result.events.find((event) => event.ability === '互相提攜')!.participantDiceIds, ['a', 'b']);
      assert.equal(result.items.length, 2);
      assert.equal(result.bonusDice.length, 0);
    }
  }
  assert.ok(found);
});

test('dual tags count once for guards, royal guards count other noble faces and elders count distinct species', () => {
  const result = resolve([die('a', 'guard'), die('b', 'royalGuard'), die('c', 'elder'), die('d', 'family')]);
  assert.equal(result.totalShield, 3 * b.guard.shield);
  assert.equal(result.items[1].finalDamage, 4 + 5 * b.royalGuard.bonusPerNoble);
  assert.equal(result.items[2].finalDamage, 4 + 4 * b.elder.bonusPerSpecies);
});

test('isolated loner, hungry glutton and knight retain distinct conditional base rules', () => {
  const loner = die('a', 'food'); loner.faces[0].creature = 'loner';
  const result = resolve([loner, die('b', 'glutton'), die('c', 'knight')]);
  assert.equal(result.items[0].finalDamage, 4 * b.loner.multiplier);
  assert.equal(result.items[1].finalDamage, 4 * b.glutton.hungryMultiplier);
  assert.equal(result.items[2].finalDamage, 4 + b.knight.bonus);
});
