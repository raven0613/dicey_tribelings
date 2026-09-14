import assert from 'node:assert/strict';
import test from 'node:test';
import { MONSTER_CONFIG } from '../../../configs/monsters/monsterConfig';
import { INITIAL_MAP_NODES } from '../../../configs/gameConfig';
import { createEnemy } from './enemyFactory';
import { applyEnemyDamage, resolveEnemyIntent } from './enemyIntent';
import { describeEnemyIntent, previewEnemyIntent } from './enemyDescription';
import { getEnemyForNode } from '../nodeService';

test('catalog contains the documented 28 monsters and damaging, nonempty cycles', () => {
  assert.equal(MONSTER_CONFIG.length, 28);
  assert.equal(new Set(MONSTER_CONFIG.map((enemy) => enemy.id)).size, 28);
  assert.equal(new Set(MONSTER_CONFIG.map((enemy) => enemy.name)).size, 28);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((region) =>
    MONSTER_CONFIG.filter((enemy) => enemy.region === region).length), [5, 5, 5, 5, 5, 3]);
  for (const monster of MONSTER_CONFIG) {
    assert.ok(Number.isInteger(monster.maxHp) && monster.maxHp > 0);
    assert.ok(Number.isInteger(monster.initialShield) && monster.initialShield >= 0);
    assert.ok(monster.intents.some((intent) => intent.type === 'attack' || intent.type === 'heavy_attack'));
    monster.intents.forEach((intent, index) => {
      if ('value' in intent) assert.ok(Number.isInteger(intent.value) && intent.value > 0);
      if ('counter' in intent && intent.counter?.type === 'damage_taken') {
        assert.ok(Number.isInteger(intent.counter.threshold) && intent.counter.threshold > 0);
      }
      if (intent.type === 'charge') {
        assert.ok(['attack', 'heavy_attack'].includes(monster.intents[(index + 1) % monster.intents.length].type));
      }
    });
  }
});

test('factory isolates battle state and rejects unknown IDs', () => {
  const a = createEnemy('r2_harpoon');
  const b = createEnemy('r2_harpoon');
  assert.ok(a.shield > 0);
  a.hp = 1;
  a.shield = 0;
  assert.notEqual(a.hp, b.hp);
  assert.ok(b.shield > 0);
  assert.notEqual(a.intents, b.intents);
  assert.throws(() => createEnemy('missing'), /Unknown monster/);
});

test('damage threshold is inclusive and cancellation advances the cycle', () => {
  const enemy = createEnemy('r1_slinger');
  const intent = enemy.intents[0];
  assert.ok('counter' in intent && intent.counter?.type === 'damage_taken');
  assert.ok('value' in intent);
  const threshold = intent.counter.threshold;
  for (const damage of [threshold - 1, threshold, threshold + 1]) {
    const result = resolveEnemyIntent(enemy, damage);
    assert.equal(result.damage, damage < threshold ? intent.value : 0);
    assert.equal(result.counterTriggered, damage >= threshold);
    assert.equal(result.nextIntentIndex, 1);
  }
});

test('damage counts actual shield and HP loss once, clamps overkill, and is per round', () => {
  const enemy = createEnemy('r2_harpoon');
  enemy.hp = 8;
  enemy.shield = 5;
  const first = applyEnemyDamage(enemy, 3);
  assert.equal(first.damageTaken, 3);
  assert.equal(first.enemy.shield, 2);
  const second = applyEnemyDamage(first.enemy, 4);
  assert.equal(second.damageTaken, 4);
  assert.equal(second.enemy.hp, 6);
  assert.equal(second.enemy.shield, 0);
  const last = applyEnemyDamage(second.enemy, 99);
  assert.equal(last.damageTaken, 6);
  assert.equal(last.enemy.hp, 0);
  assert.equal(applyEnemyDamage(last.enemy, 10).damageTaken, 0);
  assert.equal(applyEnemyDamage(enemy, 0).damageTaken, 0);
  assert.equal(resolveEnemyIntent(createEnemy('r1_slinger'), 0).counterTriggered, false);
});

test('shield depleted earlier still halves; odd damage rounds upward', () => {
  const enemy = createEnemy('r2_harpoon');
  enemy.shield = 0;
  enemy.intents = [{ type: 'heavy_attack', name: '測試衝撞', value: 9,
    counter: { type: 'shield_depleted', effect: 'halve' } }];
  assert.equal(resolveEnemyIntent(enemy, 0).damage, 5);
  enemy.shield = 1;
  assert.equal(resolveEnemyIntent(enemy, 99).damage, 9);
});

test('defense can be cancelled; charge and rest consume one action; dead enemies never act', () => {
  const judge = createEnemy('r5_jailer');
  judge.currentIntentIndex = 1;
  assert.equal(resolveEnemyIntent(judge, 999).shieldGain, 0);
  assert.ok(resolveEnemyIntent(judge, 0).shieldGain > 0);
  const slime = createEnemy('r1_patrol');
  slime.currentIntentIndex = 1;
  assert.equal(resolveEnemyIntent(slime, 0).damage, 0);
  assert.equal(resolveEnemyIntent(slime, 0).nextIntentIndex, 2);
  const boar = createEnemy('r2_harpoon');
  boar.currentIntentIndex = 1;
  assert.equal(resolveEnemyIntent(boar, 0).damage, 0);
  assert.equal(resolveEnemyIntent(boar, 0).shieldGain, 0);
  boar.currentIntentIndex = 2;
  assert.equal(resolveEnemyIntent(boar, 0).nextIntentIndex, 0);
  judge.hp = 0;
  assert.equal(resolveEnemyIntent(judge, 0).shieldGain, 0);
  assert.equal(resolveEnemyIntent(judge, 0).nextIntentIndex, judge.currentIntentIndex);
});

test('descriptions derive numbers and charge previews from current config', () => {
  const slime = createEnemy('r1_patrol');
  slime.currentIntentIndex = 1;
  slime.intents = [
    { type: 'attack', name: '輕擊', value: 4 },
    { type: 'charge', name: '膨脹' },
    { type: 'heavy_attack', name: '重擊', value: 17 },
  ];
  assert.equal(describeEnemyIntent(slime), '膨脹：本次蓄力，下回合造成 17 傷害。');
  const goblin = createEnemy('r1_slinger');
  const intent = goblin.intents[0];
  assert.ok('counter' in intent && intent.counter?.type === 'damage_taken');
  assert.match(previewEnemyIntent(goblin, intent.counter.threshold - 1), /尚差 1/);
  assert.match(previewEnemyIntent(goblin, intent.counter.threshold), /可打斷/);
  assert.match(previewEnemyIntent(goblin, 999), /可擊殺/);
  for (const monster of MONSTER_CONFIG) {
    const enemy = createEnemy(monster.id);
    enemy.intents.forEach((_, index) => {
      enemy.currentIntentIndex = index;
      assert.doesNotMatch(describeEnemyIntent(enemy), /undefined|NaN|\n/);
    });
  }
});

test('current combat nodes explicitly reference regional monsters of matching rank', () => {
  assert.equal(INITIAL_MAP_NODES[13].enemyId, 'r2_waterway_bully');
  assert.equal(INITIAL_MAP_NODES[13].title, '水路鱷霸');
  for (const node of INITIAL_MAP_NODES.filter((node) => ['fight', 'elite', 'boss'].includes(node.type))) {
    const enemy = getEnemyForNode(node, node.id);
    assert.equal(enemy.id, node.enemyId);
    assert.equal(enemy.region, node.region);
    assert.equal(Boolean(enemy.isBoss), node.type === 'boss');
    assert.equal(Boolean(enemy.isElite), node.type === 'elite');
  }
  assert.throws(() => getEnemyForNode({ ...INITIAL_MAP_NODES[0], enemyId: 'missing' }, 0));
});
