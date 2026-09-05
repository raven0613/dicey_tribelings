import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { EnemyCard } from '../../../components/battle/EnemyCard';
import type { Enemy } from '../../../types/enemy';
import { INITIAL_DICE_POOL } from '../../../configs/gameConfig';
import { useGameStore } from '../../../store/gameStore';
import type { GameState } from '../../../store/gameStore.types';
import { calculateRollResolution, type BattleComboSummary } from '../battleEngine';
import { runBattleSettlement } from '../battleSettlement';
import { createEnemy } from './enemyFactory';
import { describeEnemyIntent, previewEnemyIntent } from './enemyDescription';
import { MONSTER_CONFIG } from '../../../configs/monsters/monsterConfig';

function summaryWithDamage(damage: number): BattleComboSummary {
  return { items: [], bonusDice: [], triggeredEquipmentIds: [], totalDamage: damage,
    totalShield: 0, bonusControlGranted: 0, activeCombos: [], multiplier: 1 };
}

async function settle(context: TestContext, enemy: Enemy, summary: BattleComboSummary, playerHp = 60) {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  let state: GameState = { ...useGameStore.getInitialState(), currentEnemy: enemy,
    comboSummary: summary, playerHp, playerShield: 0 };
  let rolls = 0;
  const result = runBattleSettlement({
    get: () => state,
    set: (partial) => { state = { ...state, ...partial }; },
    triggerScreenShake: () => {},
    addDamagePop: () => {},
    startBattleRoll: () => { rolls++; },
  });
  // 每次 await 後執行下一個動畫計時器，省略真實等待時間。
  for (let step = 0; step < 200; step++) {
    context.mock.timers.runAll();
    await Promise.resolve();
  }
  await result;
  return { state, rolls };
}

test('production settlement counts dice, equipment and flat damage once including shield loss', async (context) => {
  const enemy = createEnemy('rock_goblin');
  enemy.hp = enemy.maxHp = 100;
  enemy.shield = 6;
  enemy.intents = [
    { type: 'heavy_attack', name: '巨石', value: 9,
      counter: { type: 'damage_taken', threshold: 12, effect: 'cancel' } },
    { type: 'rest', name: '喘息' },
  ];
  const summary = summaryWithDamage(12);
  const item = calculateRollResolution(INITIAL_DICE_POOL, [0, 0, 0], []).items[0];
  summary.items = [{ ...item, baseValue: 3, finalDamage: 3 }];
  summary.bonusDice = [{ id: 'bonus', sourceEquipmentId: 'test', sourceEquipmentName: '測試',
    element: 'fire', bonusDamage: 4, label: '追加', description: '追加' }];
  assert.equal(previewEnemyIntent(enemy, summary.totalDamage), '可打斷');
  const { state, rolls } = await settle(context, enemy, summary);
  assert.equal(state.currentEnemy?.hp, 94);
  assert.equal(state.currentEnemy?.shield, 0);
  assert.equal(state.currentEnemy?.currentIntentIndex, 1);
  assert.equal(state.playerHp, 60);
  assert.equal(rolls, 1);
});

test('flat damage consumes shield and a missed threshold applies player shield before HP', async (context) => {
  const enemy = createEnemy('rock_goblin');
  enemy.shield = 20;
  const summary = summaryWithDamage(5);
  summary.totalShield = 3;
  const { state } = await settle(context, enemy, summary);
  const intent = enemy.intents[0];
  assert.ok('value' in intent);
  assert.equal(state.currentEnemy?.hp, enemy.hp);
  assert.equal(state.currentEnemy?.shield, 15);
  assert.equal(state.playerHp, 60 - (intent.value - summary.totalShield));
  assert.equal(state.playerShield, 0);
});

test('lethal player damage ends battle before enemy action and never starts another roll', async (context) => {
  const enemy = createEnemy('rock_goblin');
  enemy.hp = 1;
  const { state, rolls } = await settle(context, enemy, summaryWithDamage(99));
  assert.equal(state.combatPhase, 'VICTORY');
  assert.equal(state.playerHp, 60);
  assert.equal(rolls, 0);
});

test('enemy lethal damage enters defeat and never starts another roll', async (context) => {
  const { state, rolls } = await settle(context, createEnemy('rock_goblin'), summaryWithDamage(0), 1);
  assert.equal(state.combatPhase, 'DEFEAT');
  assert.equal(state.playerHp, 0);
  assert.equal(rolls, 0);
});

test('cancelled defense grants zero shield through production settlement', async (context) => {
  const enemy = createEnemy('mirror_judge');
  const intent = enemy.intents[0];
  assert.ok('counter' in intent && intent.counter?.type === 'damage_taken');
  const { state } = await settle(context, enemy, summaryWithDamage(intent.counter.threshold));
  assert.equal(state.currentEnemy?.shield, 0);
  assert.equal(state.currentEnemy?.currentIntentIndex, 1);
});

test('charge advances without attacking or replenishing initial shield', async (context) => {
  const enemy = createEnemy('bubble_slime');
  enemy.currentIntentIndex = 1;
  const { state, rolls } = await settle(context, enemy, summaryWithDamage(0));
  assert.equal(state.currentEnemy?.currentIntentIndex, 2);
  assert.equal(state.currentEnemy?.shield, 0);
  assert.equal(state.playerHp, 60);
  assert.equal(rolls, 1);
});

test('EnemyCard renders every configured intent and the defeated state', () => {
  for (const monster of MONSTER_CONFIG) {
    const enemy = createEnemy(monster.id);
    enemy.intents.forEach((_, index) => {
      enemy.currentIntentIndex = index;
      const markup = renderToStaticMarkup(createElement(EnemyCard, { enemy }));
      assert.ok(markup.includes(describeEnemyIntent(enemy)));
      assert.ok(markup.includes(monster.name));
      assert.doesNotMatch(markup, /undefined|NaN/);
    });
    enemy.hp = 0;
    assert.match(renderToStaticMarkup(createElement(EnemyCard, { enemy })), /已擊敗/);
  }
});
