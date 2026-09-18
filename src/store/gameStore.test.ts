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

test('two reward choices apply in order before advancing a regional boss', () => {
  useGameStore.getState().restartGame();
  useGameStore.getState().startNode(6);
  const options = generateBattleRewardOptions(1, 'boss', () => 0.5);
  useGameStore.setState({ combatPhase: 'VICTORY', battleRewardOptions: options, battleRewardPickCount: 2 });
  useGameStore.getState().selectBattleRewards(options.slice(0, 1));
  assert.equal(useGameStore.getState().stickerFlow, null);
  useGameStore.getState().selectBattleRewards(options.slice(0, 2));
  const die = useGameStore.getState().dicePool[0];
  useGameStore.getState().applyCurrentPermanentSticker(die.id, 0);
  assert.equal(useGameStore.getState().currentNodeIndex, 6);
  useGameStore.getState().applyCurrentPermanentSticker(die.id, 1);
  assert.equal(useGameStore.getState().currentNodeIndex, 7);
  assert.equal(useGameStore.getState().currentEnemy?.region, 2);
  assert.equal(useGameStore.getState().combatPhase, 'PREPARATION');
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
    assert.equal(useGameStore.getState().playerShield, retain ? shield * EQUIPMENT_BALANCE.shieldRetention : 0);
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
