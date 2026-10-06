import assert from 'node:assert/strict';
import test from 'node:test';
import { die, resolve, faceIndex } from './testFixtures';
import { createCreatureBattleState, combatNumber } from './creatureState';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { MATERIAL_BALANCE } from '../../../configs/materials/materialConfig';

test('blank faces attack by pip and have no identity, including iridescence', () => {
  const blank = die('a', {}); blank.faces[0].material = 'iridescent';
  const result = resolve([blank], [1]);
  assert.deepEqual(result.items[0].tags, []);
  assert.equal(result.totalDamage, 1);
});
test('family gains a flat bonus per face including itself and reproduces each external gain once per other family', () => {
  const pool = [die('a', { 1: 'family', 2: 'family', 5: 'family' }), die('f', { 1: 'fruit' })];
  const result = resolve(pool);
  assert.equal(result.items[0].finalDamage, 1 + b.family.bonusPerFace * 3 + b.fruit.bonus * 3);
});
test('three sisters share each team grant once without a feedback loop', () => {
  const pool = [die('a', { 1: 'sisters' }), die('b', { 1: 'sisters' }), die('c', { 1: 'sisters' }), die('h', { 1: 'herald' })];
  const state = { ...createCreatureBattleState(), rerollBonuses: [{ diceId: 'h', damage: 4 }] };
  const result = resolve(pool, undefined, ['REROLL_DROP'], state);
  assert.deepEqual(result.items.slice(0, 3).map(item => item.finalDamage), Array(3).fill(1 + b.herald.bonusPerAttack * 3));
});
test('twins use highest pip while preserving material base modifier and full repeats per pair', () => {
  const twin = die('a', { 1: 'twins', 2: 'twins', 4: 'twins', 6: 'twins' });
  twin.faces[0].material = 'foil';
  const result = resolve([twin]);
  assert.equal(result.items[0].finalDamage, 6 + MATERIAL_BALANCE.foil);
  assert.equal(result.repeatAttacks.length, Math.floor(4 / b.twins.facesPerPair));
  assert.ok(result.repeatAttacks.every(hit => hit.damage === result.items[0].finalDamage));
});
test('warrior adds all neighboring follower faces and combines two facing followers additively', () => {
  const result = resolve([die('l', { 1: 'follower', 2: 'follower' }), die('w', { 4: 'warrior' }), die('r', { 1: 'follower' })], [1, 4, 1]);
  const warrior = (4 + 3 * b.warrior.bonusPerFollower) * (1 + 2 * b.warrior.perFacingFollower);
  assert.equal(result.items[1].finalDamage, warrior);
  assert.equal(result.items[0].finalDamage, 1 + warrior * (b.follower.fraction + b.follower.perFace));
  assert.equal(result.items[2].finalDamage, 1 + warrior * b.follower.fraction);
});
test('porters accumulate completed predecessors and restart after a gap', () => {
  const roles = ['porter', 'porter', 'porter', 'blank', 'porter'] as const;
  const result = resolve(roles.map((role, i) => die(String(i), { 1: role })));
  assert.deepEqual(result.items.map(item => item.finalDamage), [1, 2, 4, 1, 1]);
});
test('elder counts recipient same-role faces, excludes self and blank', () => {
  const result = resolve([die('e', { 1: 'elder' }), die('a', { 1: 'family', 2: 'family' }), die('b', {})]);
  assert.equal(result.items[0].finalDamage, 1);
  assert.equal(result.items[1].finalDamage, 1 + b.family.bonusPerFace * 2 + b.elder.bonusPerFace * 2 * 2);
  assert.equal(result.items[2].finalDamage, 1);
});
test('royal guard copies the actual externally delivered amount for every other noble', () => {
  const result = resolve([die('r', { 1: 'royalGuard', 2: 'elder', 3: 'authority' }), die('f', { 1: 'fruit' })]);
  assert.equal(result.items[0].finalDamage, 1 + b.fruit.bonus * 3);
});
test('authority uses the pre-coronation noble count and preserves common identity', () => {
  const result = resolve([die('a', { 1: 'authority' }), die('f', { 1: 'family' }), die('b', { 1: 'authority' })]);
  assert.deepEqual(result.items[1].tags, ['common', 'noble']);
  assert.equal(result.items[1].finalDamage, 1 + b.family.bonusPerFace + b.authority.bonusPerNoble * 2);
});
test('farmers convert from the opening food snapshot regardless of stored rations', () => {
  const pool = [die('a', { 1: 'farmer' }), die('b', { 1: 'farmer' })];
  assert.deepEqual(resolve(pool).items.map(item => item.creature), ['food', 'food']);
  const state = { ...createCreatureBattleState(), storedFood: { a: 5 }, initialRations: { a: 5 } };
  const result = resolve(pool, undefined, [], state);
  assert.deepEqual(result.items.map(item => item.creature), ['food', 'food']);
  assert.deepEqual(result.nextStoredFood, state.storedFood);
});
test('farmers use local farmer and food faces; stored food includes all pre-storage attack gains', () => {
  const pool = [die('a', { 1: 'farmer', 2: 'farmer', 3: 'food' }), die('f', { 4: 'food', 2: 'chef' })];
  const state = { ...createCreatureBattleState(), lockedDice: ['f'] };
  const result = resolve(pool, [1, 4], ['WHISTLE'], state);
  assert.equal(result.nextStoredFood.f, Math.ceil(result.items[1].finalDamage * b.food.storageMultiplier + b.chef.storagePerFace));
});
test('chef splits integers, creates only positive dice, and releases once', () => {
  const chef = die('c', { 1: 'chef', 2: 'chef', 3: 'chef', 4: 'chef' });
  for (const amount of [0, 3, 10]) {
    const state = { ...createCreatureBattleState(), storedFood: { c: amount } };
    const result = resolve([chef], [1], [], state);
    assert.equal(result.bonusDice.length, Math.min(amount, 4));
    assert.equal(result.bonusDice.reduce((sum, dice) => sum + dice.bonusDamage, 0), amount);
    assert.equal(result.nextStoredFood.c, 0);
    assert.equal(state.storedFood.c, amount);
  }
});
test('glutton reads effective food face bases while stored rations remain a chef resource', () => {
  const food = die('f', { 1: 'food', 4: 'food', 5: 'farmer' });
  food.faces[faceIndex(4)].material = 'foil';
  const result = resolve([die('g', { 1: 'glutton' }), food], undefined, [], { ...createCreatureBattleState(), storedFood: { f: 7 }, initialRations: { f: 7 } });
  assert.equal(result.items[0].finalDamage, 1 + 1 + 4 + MATERIAL_BALANCE.foil);
});
test('priest produces sacrifices times facing priests, each with the source pip', () => {
  const pool = [die('a', { 2: 'priest' }), die('b', { 5: 'priest' })];
  const state = { ...createCreatureBattleState(), altars: { a: 2, b: 1 } };
  const result = resolve(pool, [2, 5], [], state);
  assert.deepEqual(result.bonusDice.map(die => die.bonusDamage), [2, 2, 2, 2, 5, 5]);
  assert.deepEqual(result.nextAltars, { a: 0, b: 0 });
});
test('detectives each receive the complete common confiscation pool', () => {
  const result = resolve([die('b', { 1: 'boss' }), die('v', { 4: 'family' }), die('d1', { 1: 'detective' }), die('d2', { 1: 'detective' })], [1, 4, 1, 1]);
  const stolen = Math.ceil((4 + b.family.bonusPerFace) * (1 + b.boss.perRobbery));
  assert.equal(result.items[0].finalDamage, 0);
  assert.equal(result.items[2].finalDamage, combatNumber(1 + (1 + stolen) * b.detective.multiplier));
  assert.equal(result.items[3].finalDamage, result.items[2].finalDamage);
});
test('bully doubles craftsman robbery events and thieves sum their local base values', () => {
  const result = resolve([die('b', { 1: 'bully' }), die('c', { 4: 'chef' }), die('t', { 2: 'thief', 6: 'thief' })], [1, 4, 2]);
  assert.equal(result.items[0].finalDamage, 1 + 2 * b.bully.craftsmanMultiplier);
  assert.deepEqual(result.bonusDice.map(die => die.bonusDamage), [8, 8]);
});
test('princess receives external buffs and commands other princesses but never herself', () => {
  const pool = [die('a', { 1: 'princess' }), die('h', { 1: 'herald' }), die('b', { 1: 'princess' })];
  const result = resolve(pool, undefined, ['REROLL_DROP'], { ...createCreatureBattleState(), rerollBonuses: [{ diceId: 'h', damage: 4 }] });
  assert.equal(result.items[0].finalDamage, b.herald.bonusPerAttack);
  assert.equal(result.repeatAttacks.length, 2);
  assert.ok(result.repeatAttacks.every(hit => hit.diceId !== hit.sourceDiceId));
});

test('food deposits add the chef bonus after the food multiplier for each local chef face', () => {
  for (const role of ['food', 'fruit'] as const) for (let chefs = 0; chefs < 6; chefs++) {
    const cook = die('c', { 6: role, ...Object.fromEntries(Array.from({ length: chefs }, (_, i) => [i + 1, 'chef'])) });
    const state = createCreatureBattleState();
    const result = resolve([cook], [6], [], state);
    const attack = result.items[0].finalDamage;
    const amount = Math.ceil(attack * (role === 'food' ? b.food.storageMultiplier : 1) + chefs * b.chef.storagePerFace);
    assert.equal(result.nextStoredFood.c ?? 0, chefs ? amount : 0);
    assert.equal(attack, 6);
    assert.deepEqual(state.storedFood, {});
  }
});

test('a lone family gets its flat bonus once and preserves material base and external gains', () => {
  const family = die('a', { 6: 'family' }); family.faces[faceIndex(6)].material = 'foil';
  const result = resolve([family, die('f', { 1: 'fruit' })], [6, 1]);
  assert.equal(result.items[0].baseValue, 6 + MATERIAL_BALANCE.foil);
  assert.equal(result.items[0].finalDamage, 6 + MATERIAL_BALANCE.foil + b.family.bonusPerFace + b.fruit.bonus);
});
