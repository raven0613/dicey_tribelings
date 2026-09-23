import assert from 'node:assert/strict';
import test from 'node:test';
import { configuredDice } from '../../dice/diceFactory';
import { getDiceGeometry } from '../../dice/diceGeometry';
import { calculateRollResolution } from '../battleEngine';
import { createCreatureBattleState, combatNumber } from './creatureState';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { createPermanentSticker } from '../../../configs/creatures/creatureStickerConfig';
import { ALL_EQUIPMENT_CATALOG } from '../../../configs/equipment/equipmentConfig';
import type { CreatureId } from '../../../types/creatures';
const base = createPermanentSticker('family', 6).baseValue;
const die = (id: string, role: CreatureId, value = base) => configuredDice(id, id, 'd6', 'amber', Array.from({ length: 6 }, () => [role, value]));
const resolve = (pool: ReturnType<typeof die>[], state = createCreatureBattleState()) => calculateRollResolution(pool, pool.map(() => 0), [], state);

test('family thresholds use total face count and the rolled base', () => {
  for (let count = 1; count <= 6; count++) {
    const d = die('a', 'food');
    d.faces.slice(0, count).forEach((face) => { face.creature = 'family'; });
    assert.equal(resolve([d]).items[0].finalDamage, base * b.family.multipliers[count - 1]);
  }
});
test('sisters scale by board count and repeats never become bonus dice', () => {
  for (const count of [1, 2, 3, 4, 5]) {
    const result = resolve(Array.from({ length: count }, (_, i) => die(`${i}`, 'sisters')));
    const multiplier = count >= b.sisters.middle ? b.sisters.highMultiplier : count >= b.sisters.minimum ? b.sisters.multiplier : 1;
    assert.ok(result.items.every((item) => item.finalDamage === base * multiplier));
    assert.equal(result.repeatAttacks.length, count >= b.sisters.repeatAt ? count : 0);
    assert.equal(result.bonusDice.length, 0);
  }
});
test('twins share the highest base and use half/full/two repeat attacks', () => {
  for (let count = 1; count <= 6; count++) {
    const d = die('a', 'food');
    d.faces.slice(0, count).forEach((face) => { face.creature = 'twins'; face.baseValue = base / 2; });
    d.faces[count - 1].baseValue = base;
    const result = resolve([d]);
    const factors = count >= b.twins.doubleAt ? [1, 1] : count >= b.twins.fullAt ? [1] : count >= b.twins.halfAt ? [b.twins.half] : [];
    assert.equal(result.items[0].finalDamage, base);
    assert.deepEqual(result.repeatAttacks.map((attack) => attack.damage), factors.map((factor) => base * factor));
    assert.equal(result.bonusDice.length, 0);
  }
});
test('gang geometry controls bonus quantity and damage at every threshold', () => {
  for (let count = 0; count <= 4; count++) {
    const d = die('a', 'food'); d.faces[0].creature = 'gang';
    getDiceGeometry('d6')[0].neighbors.slice(0, count).forEach((index) => { d.faces[index].creature = 'gang'; });
    const result = resolve([d]);
    const copies = count * (count >= b.gang.doubleAt ? b.gang.copies : 1);
    const damage = count >= b.gang.middle ? b.gang.highDamage : b.gang.damagePerNeighbor;
    assert.deepEqual(result.bonusDice.map((bonus) => bonus.bonusDamage), Array(copies).fill(damage));
  }
});
test('porter sums original bases then applies whole-chain and final tail multipliers', () => {
  for (const count of [1, 2, 3, 4, 5, 7]) {
    const result = resolve(Array.from({ length: count }, (_, i) => die(`${i}`, 'porter', (i + 1) * base)));
    let prefix = 0;
    const expected = result.items.map((item, i) => {
      prefix += item.baseValue;
      return prefix * (count >= b.porter.doubleAt ? b.porter.multiplier : 1) * (i === count - 1 && count >= b.porter.tailAt ? b.porter.multiplier : 1);
    });
    assert.deepEqual(result.items.map((item) => item.finalDamage), expected);
    assert.deepEqual(result.repeatAttacks.map((attack) => attack.damage), count >= b.porter.repeatAt ? [expected.at(-1)] : []);
  }
});
test('warrior uses neighboring follower faces; follower preserves own value and copies original warrior base', () => {
  const result = resolve([die('a', 'warrior'), die('b', 'follower', base / 2), die('c', 'warrior')]);
  assert.equal(result.items[0].finalDamage, base * b.warrior.multiplier + 6 * b.warrior.bonusPerFollower);
  assert.equal(result.items[1].finalDamage, base * 1.5);
  assert.equal(result.repeatAttacks[0].damage, base * 1.5 * b.follower.repeatMultiplier);
  const high = resolve([die('a', 'follower'), die('b', 'warrior'), die('c', 'follower')]);
  assert.equal(high.items[1].finalDamage, base * b.warrior.highMultiplier + 12 * b.warrior.bonusPerFollower);
});
test('loner only uses the stronger multiplier with one local face and no other warrior', () => {
  const d = die('a', 'food'); d.faces[0].creature = 'loner';
  assert.equal(resolve([d]).items[0].finalDamage, base * b.loner.soloMultiplier);
  assert.equal(resolve([d, die('b', 'guard')]).items[0].finalDamage, base * b.loner.multiplier);
  assert.equal(resolve([die('a', 'loner')]).items[0].finalDamage, base);
});
test('food boosts, glutton sum and chef storage use the same strengthened food values', () => {
  const foods = Array.from({ length: b.glutton.sumAt }, (_, i) => { const d = die(`f${i}`, 'food'); d.faces[1].creature = 'chef'; return d; });
  const result = resolve([...foods, die('farmer', 'farmer'), die('g', 'glutton')]);
  const foodTotal = foods.length * base + foods.length * b.farmer.foodBonus;
  assert.equal(result.items.at(-1)!.finalDamage, base * (1 + foods.length * b.glutton.perFood.at(-1)!) + foodTotal);
  assert.equal(Object.values(result.nextStoredFood).reduce((sum, value) => sum + value, 0), foodTotal);
  const farm = die('a', 'farmer'); farm.faces[1].creature = 'chef';
  const converted = resolve([farm, die('b', 'farmer')]);
  assert.deepEqual(converted.items.map((item) => item.creature), ['food', 'food']);
  assert.equal(converted.nextStoredFood.a, base);
});
test('chef thresholds preserve a fraction of the original bank without mutating previews', () => {
  for (const amount of [b.chef.retainAt - 1, b.chef.retainAt, b.chef.burstAt - 1, b.chef.burstAt]) {
    const state = createCreatureBattleState(); state.storedFood.a = amount;
    const result = resolve([die('a', 'chef')], state);
    const high = amount >= b.chef.burstAt;
    assert.equal(result.bonusDice[0].bonusDamage, amount * (high ? b.chef.multiplier : 1));
    assert.equal(result.nextStoredFood.a, combatNumber(amount * (high ? b.chef.highRetention : amount >= b.chef.retainAt ? b.chef.retention : 0)));
    assert.equal(state.storedFood.a, amount);
    assert.deepEqual(result, resolve([die('a', 'chef')], state));
  }
});
test('fruit uses other food to boost neighbors and stores its own food value', () => {
  const fruit = die('fruit', 'fruit'); fruit.faces[1].creature = 'chef';
  const food = die('food', 'food'); food.faces[1].creature = 'chef';
  const result = resolve([die('a', 'warrior'), fruit, food]);
  assert.equal(result.items[0].finalDamage, base + b.fruit.highBonus);
  assert.equal(result.nextStoredFood.food, base + b.fruit.highBonus);
  assert.equal(result.nextStoredFood.fruit, base);
});
test('thieves produce one bonus per transfer even after being robbed to zero', () => {
  const result = resolve([die('boss', 'boss'), die('thief', 'thief')]);
  assert.equal(result.items[0].finalDamage, base + Math.ceil(base * b.boss.multipliers[0]));
  assert.equal(result.items[1].finalDamage, 0);
  assert.deepEqual(result.bonusDice.map((bonus) => bonus.bonusDamage), [base]);
  const both = resolve([die('left', 'thief'), die('bully', 'bully'), die('right', 'thief')]);
  assert.equal(both.bonusDice.length, 4);
});
test('boss chain counts this robbery and never selects one target twice', () => {
  const result = resolve([die('a', 'boss'), die('b', 'boss'), die('c', 'boss')]);
  const events = result.events.filter((event) => event.relation === 'robbery');
  const victims = events.flatMap((event) => event.changes.filter((change) => change.kind === 'attack' && change.after === 0));
  assert.equal(new Set(victims.map((change) => change.targetId)).size, victims.length);
  events.forEach((event, i) => {
    const lost = event.changes.find((change) => change.after === 0)!;
    const gained = event.changes.find((change) => change.targetId === event.sourceDiceId)!;
    assert.equal(gained.after - gained.before, Math.ceil(lost.before * b.boss.multipliers[Math.min(i, b.boss.multipliers.length - 1)]));
  });
});
test('detectives confiscate each culprit once and split one pool exactly', () => {
  const result = resolve([die('left', 'thief'), die('bully', 'bully'), die('right', 'thief'), die('d1', 'detective'), die('d2', 'detective')]);
  const bully = result.events.filter((e) => e.sourceDiceId === 'bully').flatMap((e) => e.changes).filter((change) => change.targetId === 'bully').at(-1)!.after;
  assert.equal(result.items[1].finalDamage, 0);
  assert.equal(combatNumber(result.items[3].finalDamage + result.items[4].finalDamage - base * 2), combatNumber(bully * b.detective.multiplier));
  assert.equal(result.bonusDice.length, 4);
});
test('guards and artisans use higher shield tier and bulwarks preserve shared shields', () => {
  const result = resolve([die('a', 'guard'), ...Array.from({ length: b.guard.threshold }, (_, i) => die(`f${i}`, 'family')), die('giant', 'bulwark')]);
  assert.equal(result.totalShield, b.guard.threshold * b.guard.highShield);
  const artisan = resolve([die('a', 'artisan'), die('b', 'artisan'), die('giant', 'bulwark')]);
  assert.equal(artisan.totalShield, 8 * b.artisan.highShield);
  assert.equal(artisan.bonusDice[0].bonusDamage, artisan.totalShield * b.bulwark.highMultiplier);
});
test('authority uses the pre-conferral noble snapshot and knights earn noble before guard counts', () => {
  const result = resolve([die('a', 'authority'), die('f', 'family'), die('b', 'authority')]);
  assert.equal(result.items[1].finalDamage, base * b.family.multipliers.at(-1)!);
  const knight = resolve([die('k', 'knight'), ...Array.from({ length: b.knight.burstAt }, (_, i) => die(`f${i}`, 'family')), die('p', 'princess')]);
  assert.ok(knight.items[0].tags.includes('noble'));
  assert.equal(knight.items[0].finalDamage, (base + b.knight.burstAt * b.knight.highBonus) * b.knight.multiplier);
  assert.equal(knight.repeatAttacks.length, 1);
});
test('imposter uses board majority then its own configured majority', () => {
  const local = die('i', 'sisters'); local.faces[0].creature = 'imposter';
  const result = resolve([die('a', 'family'), local]);
  assert.equal(result.items[1].creature, 'sisters');
  const board = resolve([die('a', 'sisters'), die('b', 'sisters'), die('i', 'imposter')]);
  assert.ok(board.items.every((item) => item.creature === 'sisters'));
});
test('cheer registers one die per source before herald and fills it from the final warrior', () => {
  const pool = [die('gang', 'gang'), die('h', 'herald'), die('w1', 'warrior'), die('w2', 'guard'), die('w3', 'knight'), die('c1', 'cheerleader'), die('c2', 'cheerleader')];
  const result = resolve(pool);
  const cheers = result.bonusDice.filter((bonus) => bonus.creature === 'cheerleader');
  const quantity = 4 * b.gang.copies + 2;
  assert.equal(result.bonusDice.length, quantity);
  assert.equal(cheers.length, 2);
  const highest = Math.max(...result.items.filter((item) => item.tags.includes('warrior')).map((item) => item.finalDamage));
  assert.ok(cheers.every((bonus) => bonus.bonusDamage === highest + b.herald.bonusDiceDamage));
  assert.ok(result.events.filter((e) => e.skill === 'cheerleader' && e.stage === 5).every((e) => e.bonusIds.length === 1 && e.changes.every((change) => change.kind !== 'bonus')));
});
test('princess only repeats noble bodies and each event continues the prior value', () => {
  const pool = [die('p', 'princess'), die('n', 'elder'), die('g', 'gang'), die('h', 'herald')];
  const result = calculateRollResolution(pool, pool.map(() => 0), ALL_EQUIPMENT_CATALOG.filter((eq) => ['RESERVE', 'RESONATOR'].includes(eq.ruleId)));
  assert.equal(result.repeatAttacks.length, 1);
  assert.equal(result.repeatAttacks[0].damage, result.items[1].finalDamage);
  const values = new Map(result.items.map((item) => [`attack:${item.diceId}`, item.rolledBaseValue]));
  for (const event of result.events) for (const change of event.changes) {
    const key = `${change.kind}:${change.targetId}`;
    assert.equal(change.before, values.get(key) ?? 0);
    values.set(key, change.after);
  }
});

test('knight and porter multiply support before theft while herald is added afterward', () => {
  const pool = [die('k', 'knight'), die('g', 'gang'), ...Array.from({ length: 4 }, (_, i) => die(`f${i}`, 'family')), die('h', 'herald')];
  const result = resolve(pool);
  const bonusCount = result.bonusDice.length;
  assert.equal(result.items[0].finalDamage, (base + b.knight.burstAt * b.knight.highBonus) * b.knight.multiplier + bonusCount * b.herald.bonusPerAttack);
  const porters = Array.from({ length: b.porter.tailAt }, (_, i) => die(`p${i}`, 'porter'));
  const robbery = resolve([...porters, die('bully', 'bully')]);
  const tail = base * porters.length * b.porter.multiplier * b.porter.multiplier;
  assert.equal(robbery.items[porters.length - 1].finalDamage, tail * (1 - b.bully.stolenFraction));
  assert.equal(robbery.items.at(-1)!.finalDamage, base + tail * b.bully.stolenFraction * b.bully.craftsmanMultiplier);
});
