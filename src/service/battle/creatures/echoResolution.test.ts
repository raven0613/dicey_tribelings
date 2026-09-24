import assert from 'node:assert/strict';
import test from 'node:test';
import { configuredDice } from '../../dice/diceFactory';
import { calculateRollResolution } from '../battleEngine';
import { createCreatureBattleState } from './creatureState';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { FOOD_CAPACITY } from '../../../configs/materials/materialConfig';
import type { CreatureId } from '../../../types/creatures';
const die = (id: string, role: CreatureId, echo = false) => {
  const result = configuredDice(id, id, 'd6', 'amber', Array.from({ length: 6 }, () => [role, 4]));
  if (echo) result.faces[0].material = 'echo';
  return result;
};
const resolve = (pool: ReturnType<typeof die>[], state = createCreatureBattleState()) => calculateRollResolution(pool, pool.map(() => 0), [], state);

test('echo food stores twice with capacity limits, once per face per battle', () => {
  const food = die('food', 'food', true); food.faces[1].creature = 'chef';
  const first = resolve([food]);
  assert.equal(first.nextStoredFood.food, food.faces[0].baseValue * 2);
  assert.ok(first.events.some(e => e.echoed && e.ability.startsWith('迴響：') && e.changes.some(c => c.kind === 'food')));
  const state = createCreatureBattleState(); state.echoUsed = first.nextEchoUsed;
  assert.equal(resolve([food], state).nextStoredFood.food, food.faces[0].baseValue);
  state.echoUsed = []; state.storedFood.food = FOOD_CAPACITY.crocodile - food.faces[0].baseValue - 1;
  assert.equal(resolve([food], state).nextStoredFood.food, FOOD_CAPACITY.crocodile);
});

test('echo fruit covers both neighbor boosts and its later storage', () => {
  const fruit = die('fruit', 'fruit', true); fruit.faces[1].creature = 'chef';
  const result = resolve([fruit, die('neighbor', 'family')]);
  assert.equal(result.nextStoredFood.fruit, fruit.faces[0].baseValue * 2);
  const boosts = result.events.filter(e => e.skill === 'fruit').flatMap(e => e.changes);
  assert.equal(boosts.filter(c => c.kind === 'attack').reduce((n, c) => n + c.after - c.before, 0), b.fruit.bonus * 2);
});

test('echo farmer transformation adds one food value without repeating later storage', () => {
  const farmer = die('farmer', 'farmer', true); farmer.faces[1].creature = 'chef';
  const result = resolve([farmer]);
  assert.equal(result.items[0].finalDamage, farmer.faces[0].baseValue * 2);
  assert.equal(result.nextStoredFood.farmer, farmer.faces[0].baseValue * 2);
  assert.equal(result.leftoverFood, farmer.faces[0].baseValue * 2);
  assert.equal(result.items.filter(item => item.tags.includes('food')).length, 1);
});

test('echo authority crowns a different neighbor and consumes once even with one candidate', () => {
  const authority = die('authority', 'authority', true);
  const pool = [die('left', 'family'), authority, die('right', 'family')];
  const result = resolve(pool);
  assert.ok(result.items.every(item => item.tags.includes('noble')));
  assert.equal(result.events.filter(e => e.skill === 'authority' && e.echoed).flatMap(e => e.identities).length, 1);
  assert.deepEqual(resolve(pool.slice(0, 2)).nextEchoUsed, [authority.faces[0].id]);
  assert.deepEqual(resolve([authority]).nextEchoUsed, []);
});

test('echo spans knight and porter late multipliers and every bully target', () => {
  const knight = die('knight', 'knight', true);
  const result = resolve([knight, ...Array.from({ length: b.knight.burstAt }, (_, i) => die(`n${i}`, 'family'))]);
  const before = knight.faces[0].baseValue + b.knight.burstAt * b.knight.highBonus * 2;
  assert.equal(result.items[0].finalDamage, before * (1 + (b.knight.multiplier - 1) * 2));
  const pool = Array.from({ length: b.porter.tailAt }, (_, i) => die(`p${i}`, 'porter', i === b.porter.tailAt - 1));
  const tail = resolve(pool).items.at(-1)!;
  const base = pool[0].faces[0].baseValue;
  const initial = base + (base * pool.length * b.porter.multiplier - base) * 2;
  assert.equal(tail.finalDamage, initial * (1 + (b.porter.multiplier - 1) * 2));
  const robbery = resolve([die('left', 'food'), die('bully', 'bully', true), die('right', 'food')]);
  assert.deepEqual(robbery.nextEchoUsed, []);
  const both = resolve([die('left', 'priest'), die('bully', 'bully', true), die('right', 'priest')]);
  assert.equal(both.items[1].finalDamage, base + 2 * base * b.bully.stolenFraction * b.bully.multiplier * 2);
  assert.equal(both.items[0].finalDamage, base * (1 - b.bully.stolenFraction));
});

test('both authority coronations use the opening noble count and preserve the first target lock', async () => {
  const { refreshAuthorityTargets } = await import('./rerollResolution');
  const pool = [die('left', 'family'), die('authority', 'authority', true), die('right', 'family')];
  const nobles = Array.from({ length: b.authority.threshold - 2 }, (_, i) => die(`noble-${i}`, 'priest'));
  const first = resolve([...pool, ...nobles]);
  const events = first.events.filter(e => e.skill === 'authority');
  assert.equal(events.length, 2);
  assert.ok(events.every(e => e.changes.length === 0));
  const state = refreshAuthorityTargets(pool, pool.map(() => 0), [], createCreatureBattleState());
  const ordinary = resolve(pool).events.find(e => e.skill === 'authority' && !e.echoed)!;
  assert.equal(state.authorityTargets.authority.diceId, ordinary.identities[0].diceId);
  const strengthened = resolve([...pool, ...nobles, die('third-noble', 'priest')]);
  const changes = strengthened.events.filter(e => e.skill === 'authority').flatMap(e => e.changes);
  assert.equal(changes.length, 2);
  assert.ok(changes.every(c => c.after - c.before === pool[0].faces[0].baseValue * b.authority.bonus));
});

test('echo cheerleader resolves both pending copies and marks their final feedback', () => {
  const pool = [die('cheer', 'cheerleader', true), ...Array.from({ length: b.cheerleader.copyAt }, (_, i) => die(`warrior-${i}`, 'warrior'))];
  const result = resolve(pool);
  const highest = Math.max(...result.items.filter(i => i.tags.includes('warrior')).map(i => i.finalDamage));
  assert.equal(result.bonusDice.length, 2);
  assert.ok(result.bonusDice.every(bonus => bonus.bonusDamage === highest));
  assert.ok(result.events.some(e => e.echoed && e.stage === 10 && e.ability.startsWith('迴響：') && e.changes[0].after === highest));
});

test('reroll echoes retain the actual source ability after its face changes', async () => {
  const { resolveRerollChain } = await import('./rerollResolution');
  const coward = die('coward', 'coward', true); coward.faces[1].creature = 'family';
  const steps = resolveRerollChain([coward], [0], createCreatureBattleState(), 0, [], () => 0);
  assert.deepEqual(steps[0].state.rerollEchoes, [{ diceId: coward.id, skill: 'coward' }]);
  assert.equal(steps[0].state.cowardShields.coward, coward.faces[0].baseValue * 2);
});
