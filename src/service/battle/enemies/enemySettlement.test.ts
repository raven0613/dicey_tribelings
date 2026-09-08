import { ALL_EQUIPMENT_CATALOG, EQUIPMENT_BALANCE } from '../../../configs/equipment/equipmentConfig';
import { createCreatureBattleState } from '../creatures/creatureState';
import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import type { Enemy } from '../../../types/enemy';
import { INITIAL_DICE_POOL } from '../../../configs/gameConfig';
import { useGameStore } from '../../../store/gameStore';
import type { GameState } from '../../../store/gameStore.types';
import { calculateRollResolution, type BattleComboSummary } from '../battleEngine';
import { runBattleSettlement } from '../battleSettlement';
import { createEnemy } from './enemyFactory';
import { previewEnemyIntent } from './enemyDescription';
import type { Dice } from '../../../types/game';

function summaryWithDamage(damage: number): BattleComboSummary {
  return { items: [], repeatAttacks: [], events: [], goldGranted: 0, leftoverFood: 0, bonusDice: damage > 0 ? [{ id: 'attack', source: { kind: 'equipment', equipmentId: 'test' },
    sourceName: '測試', bonusDamage: damage, label: '追加', description: '追加' }] : [], triggeredEquipmentIds: [], totalDamage: damage,
    totalShield: 0, bonusControlGranted: 0, nextStoredFood: {} };
}

async function settle(context: TestContext, enemy: Enemy, summary: BattleComboSummary, playerHp = 60, initial: Partial<GameState> = {}) {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  let state: GameState = { ...useGameStore.getInitialState(), currentEnemy: enemy,
    comboSummary: summary, playerHp, playerShield: 0, combatPhase: 'CONTROL_PHASE', activeRerollingIndex: null, ...initial };
  let rolls = 0;
  const result = runBattleSettlement({
    get: () => state,
    set: (partial) => { state = { ...state, ...partial }; },
    triggerScreenShake: () => {},
    addDamagePop: () => {},
    startBattleRoll: () => { rolls++; },
  });
  // 每次 await 後執行下一個動畫計時器，省略真實等待時間。
  for (let step = 0; step < 1000; step++) {
    context.mock.timers.runAll();
    await Promise.resolve();
  }
  await result;
  return { state, rolls };
}

test('production settlement counts each normal and additional attack once including shield loss', async (context) => {
  const enemy = createEnemy('r1_slinger');
  enemy.hp = enemy.maxHp = 100;
  enemy.shield = 6;
  enemy.intents = [
    { type: 'heavy_attack', name: '巨石', value: 9,
      counter: { type: 'damage_taken', threshold: 12, effect: 'cancel' } },
    { type: 'rest', name: '喘息' },
  ];
  const summary = summaryWithDamage(12);
  const item = calculateRollResolution(INITIAL_DICE_POOL, [4, 1, 2], []).items[0];
  summary.items = [{ ...item, baseValue: 3, finalDamage: 3 }];
  summary.bonusDice = [4, 5].map((bonusDamage, index) => ({ id: `bonus-${index}`,
    source: { kind: 'equipment', equipmentId: 'test' }, sourceName: '測試', bonusDamage, label: '追加', description: '追加' }));
  assert.equal(previewEnemyIntent(enemy, summary.totalDamage), '可打斷');
  const { state, rolls } = await settle(context, enemy, summary);
  assert.equal(state.currentEnemy?.hp, 94);
  assert.equal(state.currentEnemy?.shield, 0);
  assert.equal(state.currentEnemy?.currentIntentIndex, 1);
  assert.equal(state.playerHp, 60);
  assert.equal(rolls, 1);
});

test('additional attack consumes shield and a missed threshold applies player shield before HP', async (context) => {
  const enemy = createEnemy('r1_slinger');
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
  const enemy = createEnemy('r1_slinger');
  enemy.hp = 1;
  const { state, rolls } = await settle(context, enemy, summaryWithDamage(99));
  assert.equal(state.combatPhase, 'VICTORY');
  assert.equal(state.playerHp, 60);
  assert.equal(rolls, 0);
});

test('enemy lethal damage enters defeat and never starts another roll', async (context) => {
  const { state, rolls } = await settle(context, createEnemy('r1_slinger'), summaryWithDamage(0), 1);
  assert.equal(state.combatPhase, 'DEFEAT');
  assert.equal(state.playerHp, 0);
  assert.equal(rolls, 0);
});

test('cancelled defense grants zero shield through production settlement', async (context) => {
  const enemy = createEnemy('r5_jailer');
  enemy.currentIntentIndex = 1;
  const intent = enemy.intents[1];
  assert.ok('counter' in intent && intent.counter?.type === 'damage_taken');
  const { state } = await settle(context, enemy, summaryWithDamage(intent.counter.threshold));
  assert.equal(state.currentEnemy?.shield, 0);
  assert.equal(state.currentEnemy?.currentIntentIndex, 2);
});

test('charge advances without attacking or replenishing initial shield', async (context) => {
  const enemy = createEnemy('r1_patrol');
  enemy.currentIntentIndex = 1;
  const { state, rolls } = await settle(context, enemy, summaryWithDamage(0));
  assert.equal(state.currentEnemy?.currentIntentIndex, 2);
  assert.equal(state.currentEnemy?.shield, 0);
  assert.equal(state.playerHp, 60);
  assert.equal(rolls, 1);
});

test('settlement attacks match preview after robbery and porter support with gang bonus preserved', async (context) => {
  const creatures = ['gang', 'boss', 'thief', 'porter', 'porter'] as const;
  const pool: Dice[] = creatures.map((creature, index) => ({ id: `die-${index}`, name: creature, dieType: 'd6', colorTheme: 'emerald',
    faces: Array.from({ length: 6 }, (_, face) => ({ id: `${index}-${face}`, baseValue: 4,
      creature: face === 0 || (creature === 'gang' && face < 3) ? creature : 'food' })) }));
  const summary = calculateRollResolution(pool, pool.map(() => 0), []);
  const enemy = createEnemy('r1_slinger');
  enemy.hp = enemy.maxHp = 1000; enemy.shield = 0;
  const { state } = await settle(context, enemy, summary);
  assert.equal(state.currentEnemy?.hp, enemy.hp - summary.totalDamage);
  assert.equal(summary.bonusDice.filter((bonus) => bonus.creature === 'gang').length, 1);
});

test('locking commits chef food once and rejects another settlement during the animation', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const chef: Dice = { id: 'chef', name: '廚師骰', dieType: 'd6', colorTheme: 'emerald',
    faces: Array.from({ length: 6 }, (_, index) => ({ id: `chef-${index}`, creature: index === 0 ? 'chef' : 'food', baseValue: 4 })) };
  const enemy = createEnemy('r1_slinger');
  enemy.hp = enemy.maxHp = 100;
  const creatureBattleState = { ...createCreatureBattleState(), storedFood: { chef: 7 } };
  let state: GameState = { ...useGameStore.getInitialState(), dicePool: [chef], rolledIndices: [0],
    currentEnemy: enemy, creatureBattleState, combatPhase: 'CONTROL_PHASE',
    comboSummary: calculateRollResolution([chef], [0], [], creatureBattleState) };
  const methods = { get: () => state, set: (partial: Partial<GameState>) => { state = { ...state, ...partial }; },
    triggerScreenShake: () => {}, addDamagePop: () => {}, startBattleRoll: () => {} };
  const first = runBattleSettlement(methods);
  assert.equal(state.creatureBattleState.storedFood.chef, 0);
  await runBattleSettlement(methods);
  for (let step = 0; step < 1000; step++) { context.mock.timers.runAll(); await Promise.resolve(); }
  await first;
  assert.equal(state.currentEnemy?.hp, 89);
  assert.equal(state.creatureBattleState.storedFood.chef, 0);
});


test('remaining shields carry fully into the next round and abacus refills only to the configured ceiling', async (context) => {
  const enemy = createEnemy('r1_patrol'); enemy.currentIntentIndex = 1;
  const summary = summaryWithDamage(0); summary.totalShield = 3; summary.bonusControlGranted = 1;
  const maxControl = 3;
  const { state } = await settle(context, enemy, summary, 60,
    { playerShield: 7, maxControl, control: maxControl + EQUIPMENT_BALANCE.controlHeadroom });
  assert.equal(state.playerShield, 10);
  assert.equal(state.control, maxControl + EQUIPMENT_BALANCE.controlHeadroom);
});

test('victory packs rations and clears battle food storage', async (context) => {
  const enemy = createEnemy('r1_patrol'); enemy.hp = 1;
  const summary = summaryWithDamage(9); summary.leftoverFood = 17; summary.nextStoredFood = { chef: 12 };
  const { state } = await settle(context, enemy, summary, 60,
    { equipments: ALL_EQUIPMENT_CATALOG.filter((item) => item.ruleId === 'RATIONS') });
  assert.equal(state.storedRations, 17);
  assert.deepEqual(state.creatureBattleState.storedFood, {});
});

test('regional boss victory restores capped HP and offers two permanent rewards while final boss completes rescue', async (context) => {
  const enemy = createEnemy('r1_boss'); enemy.hp = 1;
  const { state } = await settle(context, enemy, summaryWithDamage(10), 50);
  assert.equal(state.playerHp, 60);
  assert.equal(state.battleRewardOptions.length, 5);
  assert.equal(state.battleRewardPickCount, 2);
  assert.equal(state.combatPhase, 'VICTORY');
});

test('final boss victory offers no further construction rewards', async (context) => {
  const enemy = createEnemy('r6_boss'); enemy.hp = 1; enemy.shield = 0;
  const { state } = await settle(context, enemy, summaryWithDamage(10), 40);
  assert.equal(state.playerHp, 40);
  assert.deepEqual(state.battleRewardOptions, []);
  assert.equal(state.battleRewardPickCount, 0);
  assert.equal(state.combatPhase, 'VICTORY');
});
