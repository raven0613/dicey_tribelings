import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_EQUIPMENT_CATALOG, EQUIPMENT_BALANCE as eq } from '../../../configs/equipment/equipmentConfig';
import { configuredDice } from '../../dice/diceFactory';
import type { CreatureId } from '../../../types/creatures';
import { calculateRollResolution } from '../battleEngine';
import { createCreatureBattleState, combatNumber } from './creatureState';
import { buildAttackPlan } from '../attackPlan';
import { applyEnemyDamage } from '../enemies/enemyIntent';
import { createEnemy } from '../enemies/enemyFactory';
import { computeMaxControl } from '../nodeService';

const die = (id: string, creature: CreatureId, value = 4) => configuredDice(id, id, 'd6', 'amber',
  Array.from({ length: 6 }, () => [creature, value] as [CreatureId, number]));
const equipment = (...rules: string[]) => ALL_EQUIPMENT_CATALOG.filter((item) => rules.includes(item.ruleId));

test('virtual rations count as one food and distribute one total across chef dice', () => {
  const pool = [die('a', 'chef'), die('b', 'food'), die('c', 'farmer'), die('d', 'glutton')];
  pool[1].faces[1].creature = 'chef';
  const state = { ...createCreatureBattleState(), virtualFood: 9 };
  const result = calculateRollResolution(pool, [0, 0, 0, 0], equipment('RATIONS'), state);
  assert.equal(result.items[2].creature, 'farmer');
  assert.equal(result.nextStoredFood.a, 0);
  assert.equal(result.bonusDice[0].bonusDamage, Math.ceil(state.virtualFood / 2));
  assert.equal(result.nextStoredFood.b, Math.floor(state.virtualFood / 2) + pool[1].faces[0].baseValue + b.farmer.foodBonus);
  assert.equal(result.items[3].finalDamage, 12);
  assert.equal(result.items.length, 4);
  assert.equal(result.leftoverFood, pool[1].faces[0].baseValue + b.farmer.foodBonus);
});

test('extra barricade shield feeds each bulwark; resonator and reserve affect their specified attack types', () => {
  const pool = [die('a', 'bulwark'), die('b', 'bulwark')];
  const result = calculateRollResolution(pool, [0, 0], equipment('BARRICADE', 'RESONATOR', 'RESERVE'),
    createCreatureBattleState(), { control: 2, maxControl: 3, gold: 0 });
  assert.equal(result.totalShield, eq.barricadeShield);
  assert.deepEqual(result.bonusDice.map((bonus) => bonus.bonusDamage), [eq.barricadeShield + eq.bonusDamage, eq.barricadeShield + eq.bonusDamage]);
  assert.deepEqual(result.items.map((item) => item.finalDamage), [4 + 2 * eq.reserveDamage, 4]);
});

test('frugal reads spent Control rather than refunded balance, and purse pays once per settlement', () => {
  const pool = [die('a', 'bully'), die('b', 'thief'), die('c', 'bully')];
  const gear = equipment('FRUGAL', 'PURSE');
  const state = createCreatureBattleState();
  const spent = calculateRollResolution(pool, [0, 0, 0], gear, { ...state, controlSpent: 1 });
  const saved = calculateRollResolution(pool, [0, 0, 0], gear, state);
  saved.items.forEach((item, index) => assert.equal(item.finalDamage, combatNumber(spent.items[index].finalDamage * eq.frugalMultiplier)));
  assert.ok(saved.goldGranted >= eq.stolenGoldMin && saved.goldGranted <= eq.stolenGoldMax);
  assert.equal(saved.goldGranted, spent.goldGranted);
});

test('crown changes common identity before theft and princess snapshots, abacus counts distinct tags', () => {
  const pool = [die('a', 'boss', 2), die('b', 'family', 8), die('c', 'princess', 0), die('d', 'imposter')];
  const result = calculateRollResolution(pool, [0, 0, 0, 0], equipment('CROWN', 'ABACUS'));
  assert.deepEqual(result.items[1].tags, ['noble']);
  assert.equal(result.items[1].finalDamage > 0, true);
  assert.equal(result.repeatAttacks[0].diceId, 'b');
  assert.equal(result.bonusControlGranted, 0); // 偽裝後的角色標籤取代神秘，場上只有普通與貴族。
});

test('slot match grants one base contribution and retains other support bonuses', () => {
  const pool = [die('a', 'family', 4), die('b', 'guard', 4), die('c', 'chef', 3)];
  const bare = calculateRollResolution(pool, [0, 0, 0], []);
  const result = calculateRollResolution(pool, [0, 0, 0], equipment('SLOTS'));
  assert.deepEqual(result.items.map((item, index) => item.finalDamage - bare.items[index].finalDamage),
    [4 * (eq.matchedMultiplier - 1), 4 * (eq.matchedMultiplier - 1), 0]);
});

test('warhammer shares exact preview and sequential normal, bonus and repeat damage after shield breaks', () => {
  const pool = [die('a', 'gang', 4), die('b', 'elder', 4), die('c', 'princess', 0)];
  const gear = equipment('WARHAMMER');
  const enemy = createEnemy('r1_slinger'); enemy.hp = enemy.maxHp = 1000; enemy.shield = 6;
  const summary = calculateRollResolution(pool, [0, 0, 0], gear, createCreatureBattleState(),
    { control: 0, maxControl: 3, gold: 0, currentEnemy: enemy });
  const plan = buildAttackPlan(summary, enemy.shield, gear);
  assert.equal(plan[0].value, Math.ceil(combatNumber(summary.items[0].finalDamage * eq.shieldDamageMultiplier)));
  assert.equal(plan[1].value, Math.ceil(combatNumber(summary.items[1].finalDamage * eq.shieldDamageMultiplier)));
  assert.equal(plan[2].value, summary.bonusDice[0].bonusDamage);
  assert.deepEqual(plan.filter((hit) => hit.bonus).map((hit) => hit.value), summary.bonusDice.map((bonus) => bonus.bonusDamage));
  assert.equal(plan.at(-1)!.value, summary.repeatAttacks[0].damage);
  const remaining = plan.reduce((target, attack) => applyEnemyDamage(target, attack.value).enemy, enemy);
  assert.equal(combatNumber(enemy.hp + enemy.shield - remaining.hp - remaining.shield), summary.totalDamage);
});

test('piggy bank thresholds are strict and starting Control includes pipe', () => {
  const gear = equipment('PIGGY', 'PIPE');
  const base = computeMaxControl([]) + eq.pipeControl;
  assert.deepEqual([50, 51, 100, 101].map((gold) => computeMaxControl(gear, gold)), [base, base + 1, base + 1, base + 2]);
});

test('normal, bonus and repeated attacks round up individually after fractional skill calculations', () => {
  const pool = [die('a', 'gang', 3), die('b', 'royalGuard', 1), die('c', 'princess', 0)];
  const gear = equipment('FRUGAL');
  const summary = calculateRollResolution(pool, [0, 0, 0], gear);
  assert.equal(summary.items[0].finalDamage, 3.3);
  assert.equal(summary.items[1].finalDamage, 12.1);
  assert.deepEqual(summary.bonusDice.map((bonus) => bonus.bonusDamage), Array(4).fill(combatNumber(b.gang.damagePerNeighbor * eq.frugalMultiplier)));
  assert.equal(summary.repeatAttacks[0].damage, 12.1);
  const plan = buildAttackPlan(summary, 0, gear);
  const bonusDamage = Math.ceil(combatNumber(b.gang.damagePerNeighbor * eq.frugalMultiplier));
  assert.deepEqual(plan.map((hit) => hit.value), [4, 13, ...Array(4).fill(bonusDamage), 13]);
  assert.equal(summary.totalDamage, 30 + 4 * bonusDamage);
});

test('fractional normal hit rounds up to break shield before evaluating later warhammer hits', () => {
  const pool = [die('a', 'glutton', 3), die('b', 'chef', 2)];
  const gear = equipment('WARHAMMER');
  const summary = calculateRollResolution(pool, [0, 0], gear, createCreatureBattleState(),
    { control: 0, maxControl: 3, gold: 0, currentEnemy: { shield: 4 } });
  assert.equal(summary.items[0].finalDamage, 2.7);
  const plan = buildAttackPlan(summary, 4, gear);
  assert.deepEqual(plan.map((hit) => hit.value), [4, 2]);
  assert.equal(summary.totalDamage, 6);
});

test('robbery halves odd attack values precisely and zero attacks stay out of the attack plan', () => {
  const summary = calculateRollResolution([die('a', 'bully', 0), die('b', 'chef', 5), die('c', 'princess', 0)], [0, 0, 0], []);
  assert.equal(summary.items[1].finalDamage, 2.5);
  assert.equal(summary.items[0].finalDamage, 5);
  assert.deepEqual(buildAttackPlan(summary, 0, []).map((hit) => hit.value), [5, 3, 5]);
  assert.equal(summary.totalDamage, 13);
});

test('nearest food receives the full farmer boost in the attack plan', () => {
  const pool = [die('a', 'farmer', 1), ...['b', 'c', 'd', 'e'].map((id) => die(id, 'food', 1))];
  const summary = calculateRollResolution(pool, pool.map(() => 0), []);
  assert.deepEqual(summary.items.slice(1).map((item) => item.baseValue), [1, 1, 1, 1]);
  assert.deepEqual(buildAttackPlan(summary, 0, []).map((hit) => hit.value), [1, 4, 1, 1, 1]);
  assert.equal(summary.totalDamage, 8);
});
