import { SHOP_CONFIG } from '../configs/shopConfig';
import { getArrowTarget } from '../service/dice/directionalFaces';
import { getEffectiveFace } from '../service/dice/diceFaces';
import { REWARD_CONFIG } from '../configs/rewardConfig';
import { getPaidRerollCost } from '../service/battle/rerollCost';
import { EQUIPMENT_BALANCE } from '../configs/equipment/equipmentConfig';
import { INITIAL_MAP_NODES, CHAPTER_END_NODE } from '../configs/regions/mapConfig';
import { PROGRESSION_DICE_REWARDS } from '../configs/diceProgressionConfig';
import { chapterPath } from '../service/regions/routeService';
import { generateBattleRewardOptions } from '../service/rewards/rewardService';
import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_EQUIPMENT_CATALOG } from '../configs/gameConfig';
import { createConsumableSticker } from '../service/inventory/inventoryService';
import { DISPOSABLE_STICKERS } from '../configs/creatures/creatureStickerConfig';
import { CREATURE_BALANCE } from '../configs/creatures/creatureBalanceConfig';
import { useGameStore } from './gameStore';

test('combat nodes wait for preparation confirmation before the first roll', () => {
  useGameStore.getState().restartGame();
  assert.equal(useGameStore.getState().combatPhase, 'PREPARATION');

  useGameStore.getState().confirmBattlePreparation([]);
  assert.equal(useGameStore.getState().combatPhase, 'ROLLING');
});

test('cancelling a full chest equipment replacement returns to the same choices', () => {
  useGameStore.getState().restartGame();
  const option = {
    id: `equipment:${ALL_EQUIPMENT_CATALOG[5].id}`,
    kind: 'equipment' as const,
    equipment: ALL_EQUIPMENT_CATALOG[5],
  };
  const goldBefore = useGameStore.getState().gold;
  useGameStore.setState({
    currentNodeIndex: 2,
    equipments: ALL_EQUIPMENT_CATALOG.slice(0, 5),
    chestRewardOptions: [option],
  });

  useGameStore.getState().claimChestReward(option);
  assert.equal(useGameStore.getState().pendingEquipment?.source, 'chest');
  assert.equal(useGameStore.getState().gold, goldBefore);

  useGameStore.getState().cancelPendingEquipment();
  assert.equal(useGameStore.getState().pendingEquipment, null);
  assert.deepEqual(useGameStore.getState().chestRewardOptions, [option]);
});

test('a full shop consumable purchase charges only after one instance is replaced', () => {
  useGameStore.getState().restartGame();
  const incoming = DISPOSABLE_STICKERS[0];
  const existing = DISPOSABLE_STICKERS.slice(1, 4)
    .map((sticker, index) => createConsumableSticker(sticker, `existing-${index}`));
  useGameStore.setState({ gold: 100, shopStickers: [incoming], consumableStickers: existing });

  useGameStore.getState().buyShopSticker(incoming.id);
  assert.equal(useGameStore.getState().gold, 100);
  useGameStore.getState().replaceShopSticker(existing[1].instanceId);

  const result = useGameStore.getState();
  assert.equal(result.gold, 100 - (incoming.cost ?? 20));
  assert.equal(result.consumableStickers.length, 3);
  assert.equal(result.consumableStickers[0].instanceId, existing[0].instanceId);
  assert.equal(result.consumableStickers[2].instanceId, existing[2].instanceId);
  assert.equal(result.consumableStickers[1].stickerId, incoming.id);
});

test('rations enter the next battle first round once and round food then clears', () => {
  useGameStore.getState().restartGame();
  useGameStore.setState({ storedRations: 9, equipments: ALL_EQUIPMENT_CATALOG.filter((item) => item.ruleId === 'RATIONS') });
  useGameStore.getState().confirmBattlePreparation([]);
  assert.equal(useGameStore.getState().creatureBattleState.virtualFood, 9);
  assert.equal(useGameStore.getState().storedRations, 0);
  useGameStore.getState().startBattleRoll();
  assert.equal(useGameStore.getState().creatureBattleState.virtualFood, 0);
});

test('guaranteed princess is offered once before advancing its milestone', () => {
  useGameStore.getState().restartGame();
  useGameStore.setState({ currentNodeIndex: CREATURE_BALANCE.princess.guaranteedNode });
  useGameStore.getState().advanceToNextNode();
  assert.equal(useGameStore.getState().stickerFlow?.items[0].creature, 'princess');
  assert.equal(useGameStore.getState().princessGuaranteed, true);
  useGameStore.getState().discardCurrentSticker();
  assert.deepEqual(useGameStore.getState().routeChoices, INITIAL_MAP_NODES[CREATURE_BALANCE.princess.guaranteedNode].next);
  assert.equal(useGameStore.getState().stickerFlow, null);
});

test('shop purchases with space settle immediately and cannot buy the same offer twice', () => {
  useGameStore.getState().restartGame();
  const sticker = DISPOSABLE_STICKERS[0];
  useGameStore.setState({ shopStickers: [sticker] });
  const gold = useGameStore.getState().gold;
  assert.equal(useGameStore.getState().buyShopSticker(sticker.id), true);
  assert.equal(useGameStore.getState().pendingShopSticker, null);
  assert.equal(useGameStore.getState().consumableStickers[0].stickerId, sticker.id);
  assert.equal(useGameStore.getState().gold, gold - sticker.cost!);
  assert.equal(useGameStore.getState().buyShopSticker(sticker.id), false);
});

test('pack flow automatically stores consumables and pauses only for overflow', () => {
  useGameStore.getState().restartGame();
  const stickers = DISPOSABLE_STICKERS.slice(0, 4);
  useGameStore.setState({ openedPackResult: { packName: '測試', stickers, completion: 'stay' } });
  useGameStore.getState().beginOpenedPack();
  assert.equal(useGameStore.getState().consumableStickers.length, 3);
  assert.equal(useGameStore.getState().stickerFlow?.index, 3);
  useGameStore.getState().discardCurrentSticker();
  assert.equal(useGameStore.getState().stickerFlow, null);
});

test('reward stickers commit one at a time and advance after the final choice', () => {
  useGameStore.getState().restartGame();
  useGameStore.getState().startNode(6);
  const options = generateBattleRewardOptions(1, 'boss', () => 0.5);
  useGameStore.setState({ combatPhase: 'VICTORY', battleRewardOptions: options, battleRewardPickCount: REWARD_CONFIG.advancedPickCount });
  const before = useGameStore.getState();
  const die = before.dicePool[0];
  const first = options[0], alternative = options[2];
  assert.equal(first.kind, 'sticker');
  assert.equal(alternative.kind, 'sticker');
  if (first.kind !== 'sticker' || alternative.kind !== 'sticker') throw new Error('Expected permanent sticker rewards');

  before.applyBattleRewardSticker(first.id, die.id, die.faces.length);
  before.applyBattleRewardSticker('missing-reward', die.id, 0);
  assert.equal(useGameStore.getState().dicePool, before.dicePool);
  assert.equal(useGameStore.getState().battleRewardOptions, options);
  assert.equal(useGameStore.getState().battleRewardPickCount, REWARD_CONFIG.advancedPickCount);

  before.applyBattleRewardSticker(first.id, die.id, 0);
  const afterFirst = useGameStore.getState();
  assert.equal(afterFirst.currentNodeIndex, before.currentNodeIndex);
  assert.equal(afterFirst.combatPhase, 'VICTORY');
  assert.equal(afterFirst.stickerFlow, null);
  assert.equal(afterFirst.battleRewardPickCount, REWARD_CONFIG.advancedPickCount - 1);
  assert.deepEqual(afterFirst.battleRewardOptions, options.slice(1));
  assert.equal(afterFirst.dicePool[0].faces[0].creature, first.sticker.creature);
  assert.equal(afterFirst.dicePool[0].faces[0].baseValue, first.sticker.baseValue);
  assert.equal(afterFirst.dicePool[0].faces[0].material, first.sticker.material);
  assert.deepEqual(afterFirst.dicePool[0].faces.slice(1), die.faces.slice(1));

  afterFirst.applyBattleRewardSticker(first.id, die.id, 1);
  assert.equal(useGameStore.getState().dicePool, afterFirst.dicePool);
  assert.equal(useGameStore.getState().battleRewardPickCount, afterFirst.battleRewardPickCount);

  // A different remaining reward can be chosen after the first placement.
  afterFirst.applyBattleRewardSticker(alternative.id, die.id, 1);
  const afterLast = useGameStore.getState();
  assert.equal(afterLast.dicePool[0].faces[0].creature, first.sticker.creature);
  assert.equal(afterLast.dicePool[0].faces[1].creature, alternative.sticker.creature);
  assert.equal(afterLast.battleRewardPickCount, 0);
  assert.deepEqual(afterLast.battleRewardOptions, []);
  assert.equal(afterLast.currentNodeIndex, 7);
  assert.equal(afterLast.currentEnemy?.region, 2);
  assert.equal(afterLast.combatPhase, 'PREPARATION');
});

for (const route of ['safe', 'challenge'] as const) test(`${route} route grants all shared milestones once`, () => {
  useGameStore.getState().restartGame();
  const initialCount = useGameStore.getState().dicePool.length;
  for (const node of chapterPath(INITIAL_MAP_NODES, route).slice(0, -1)) {
    assert.equal(useGameStore.getState().mapNodes[useGameStore.getState().currentNodeIndex].id, node.id);
    if (useGameStore.getState().openedPackResult) useGameStore.getState().beginOpenedPack();
    else useGameStore.getState().advanceToNextNode();
    while (useGameStore.getState().stickerFlow) useGameStore.getState().discardCurrentSticker();
    const choices = useGameStore.getState().routeChoices;
    if (choices.length) {
      const selected = INITIAL_MAP_NODES.find((candidate) => choices.includes(candidate.id) && candidate.route === route)!;
      useGameStore.getState().chooseRoute(selected.id);
      const before = useGameStore.getState().currentNodeIndex;
      useGameStore.getState().chooseRoute(choices.find((id) => id !== selected.id)!);
      assert.equal(useGameStore.getState().currentNodeIndex, before);
    }
    useGameStore.getState().dismissDiceNotification();
  }
  const state = useGameStore.getState();
  assert.equal(state.mapNodes[state.currentNodeIndex].id, CHAPTER_END_NODE);
  assert.equal(state.dicePool.length, initialCount + Object.keys(PROGRESSION_DICE_REWARDS).length);
  assert.equal(new Set(state.dicePool.map((die) => die.id)).size, state.dicePool.length);
  assert.ok(state.princessGuaranteed);
});

test('one consumable can cover only one existing face and commit preserves the target base', () => {
  useGameStore.getState().restartGame();
  const sticker = createConsumableSticker(DISPOSABLE_STICKERS[0], 'owned');
  const die = useGameStore.getState().dicePool[0];
  useGameStore.setState({ consumableStickers: [sticker] });
  const placement = { consumable: sticker, diceId: die.id, faceIndex: 0 };
  useGameStore.getState().confirmBattlePreparation([placement, { ...placement, faceIndex: 1 }]);
  assert.equal(useGameStore.getState().combatPhase, 'PREPARATION');
  useGameStore.getState().confirmBattlePreparation([placement]);
  assert.equal(useGameStore.getState().consumableStickers.length, 0);
  assert.equal(useGameStore.getState().dicePool[0].faces[0].baseValue, die.faces[0].baseValue);
  assert.equal(useGameStore.getState().combatPhase, 'ROLLING');
});


test('next round expires player shields or preserves the configured share as existing shield', () => {
  for (const retain of [false, true]) {
    useGameStore.getState().restartGame();
    const shield = useGameStore.getState().maxHp;
    useGameStore.setState({ playerShield: shield,
      equipments: retain ? ALL_EQUIPMENT_CATALOG.filter((item) => item.ruleId === 'SHIELD_RETENTION') : [] });
    useGameStore.getState().startBattleRoll();
    assert.equal(useGameStore.getState().playerShield, retain ? Math.ceil(shield * EQUIPMENT_BALANCE.shieldRetention) : 0);
    assert.deepEqual(useGameStore.getState().creatureBattleState.cowardShields, {});
  }
});

test('each paid reroll awaits confirmation before charging, including retries after cancellation', () => {
  const store = useGameStore;
  store.getState().restartGame();
  store.getState().confirmBattlePreparation([]);
  store.getState().finishRollAnimation();
  store.setState({ control: 0 });
  const initial = store.getState();
  const cost = getPaidRerollCost(initial.creatureBattleState.paidRerolls, initial.equipments);
  store.getState().useControlReroll(0);
  assert.equal(store.getState().pendingPaidRerollDiceId, initial.dicePool[0].id);
  assert.equal(store.getState().gold, initial.gold);
  store.getState().cancelPaidReroll();
  assert.equal(store.getState().gold, initial.gold);
  assert.equal(store.getState().creatureBattleState.paidRerolls, 0);
  store.getState().useControlReroll(0);
  store.getState().confirmPaidReroll(false);
  assert.equal(store.getState().gold, initial.gold - cost);
  assert.equal(store.getState().creatureBattleState.paidRerolls, 1);
  assert.equal(store.getState().pendingPaidRerollDiceId, null);
  store.getState().confirmPaidReroll(false);
  assert.equal(store.getState().gold, initial.gold - cost);
  while (store.getState().activeRerollingIndex !== null) {
    store.getState().finishRerollAnimation(store.getState().activeRerollingIndex!);
  }
  const second = store.getState();
  const nextCost = getPaidRerollCost(second.creatureBattleState.paidRerolls, second.equipments);
  store.getState().useControlReroll(0);
  assert.equal(store.getState().pendingPaidRerollDiceId, initial.dicePool[0].id);
  assert.equal(store.getState().gold, second.gold);
  assert.equal(store.getState().creatureBattleState.paidRerolls, second.creatureBattleState.paidRerolls);
  store.getState().cancelPaidReroll();
  assert.equal(store.getState().gold, second.gold);
  store.getState().useControlReroll(0);
  assert.equal(store.getState().pendingPaidRerollDiceId, initial.dicePool[0].id);
  store.getState().confirmPaidReroll(false);
  assert.equal(store.getState().gold, second.gold - nextCost);
  assert.equal(store.getState().creatureBattleState.paidRerolls, second.creatureBattleState.paidRerolls + 1);
  store.getState().startNode(initial.currentNodeIndex);
  assert.equal(store.getState().creatureBattleState.paidRerolls, 0);
});

test('dice order commits immediately and cannot be changed after the first roll', () => {
  useGameStore.getState().restartGame();
  const pool = useGameStore.getState().dicePool;
  useGameStore.getState().moveDice(pool[0].id, pool.length - 1);
  assert.equal(useGameStore.getState().dicePool.at(-1)!.id, pool[0].id);
  const reordered = useGameStore.getState().dicePool;
  useGameStore.setState({ combatPhase: 'CONTROL_PHASE' });
  useGameStore.getState().moveDice(pool[0].id, 0);
  assert.equal(useGameStore.getState().dicePool, reordered);
  useGameStore.setState({ combatPhase: 'VICTORY' });
  useGameStore.getState().moveDice(pool[0].id, 0);
  assert.deepEqual(useGameStore.getState().dicePool, pool);
});

test('shop and chest nodes allow direct ordering without a battle', () => {
  for (const type of ['shop', 'chest']) {
    useGameStore.getState().restartGame();
    const state = useGameStore.getState();
    const index = state.mapNodes.findIndex((node) => node.type === type);
    state.startNode(index);
    const pool = useGameStore.getState().dicePool;
    assert.equal(useGameStore.getState().currentEnemy, null);
    useGameStore.getState().moveDice(pool[0].id, pool.length - 1);
    assert.equal(useGameStore.getState().dicePool.at(-1), pool[0]);
  }
});


test('arrow shop purchases charge their configured price and enter the normal consumable inventory', () => {
  useGameStore.getState().restartGame();
  const sticker = DISPOSABLE_STICKERS.find((item) => item.creature === 'directional')!;
  useGameStore.setState({ shopStickers: [sticker], gold: SHOP_CONFIG.directionalCost });
  assert.equal(useGameStore.getState().buyShopSticker(sticker.id), true);
  assert.equal(useGameStore.getState().gold, 0);
  assert.equal(useGameStore.getState().consumableStickers[0].creature, sticker.creature);
});

test('invalid arrow destinations never consume inventory; valid preparation commits the owned arrow', () => {
  useGameStore.getState().restartGame();
  const die = useGameStore.getState().dicePool[0];
  const first = createConsumableSticker(DISPOSABLE_STICKERS.find((item) => item.creature === 'directional')!, 'first');
  const second = createConsumableSticker(DISPOSABLE_STICKERS.find((item) => item.creature === 'directional')!, 'second');
  const source = { diceId: die.id, faceIndex: 0, consumable: first, direction: 'arrowRight' as const };
  const destination = { diceId: die.id, faceIndex: getArrowTarget(die, 0, 'arrowRight'), consumable: second, direction: 'arrowUp' as const };
  useGameStore.setState({ consumableStickers: [first, second] });
  useGameStore.getState().confirmBattlePreparation([source, destination]);
  assert.equal(useGameStore.getState().combatPhase, 'PREPARATION');
  assert.equal(useGameStore.getState().consumableStickers.length, 2);
  assert.equal(useGameStore.getState().dicePool[0], die);
  useGameStore.getState().confirmBattlePreparation([source]);
  const state = useGameStore.getState();
  assert.equal(state.combatPhase, 'ROLLING');
  assert.deepEqual(state.consumableStickers, [second]);
  assert.equal(getEffectiveFace(state.dicePool[0].faces[0]).creature, source.direction);
  assert.notEqual(state.rolledIndices[0], 0);
});
