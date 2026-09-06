import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_EQUIPMENT_CATALOG, ALL_STICKERS_CATALOG } from '../configs/gameConfig';
import { createConsumableSticker } from '../service/inventory/inventoryService';
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
  const incoming = ALL_STICKERS_CATALOG.find((sticker) => sticker.isDisposable)!;
  const existing = ALL_STICKERS_CATALOG.filter((sticker) => sticker.isDisposable).slice(1, 4)
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
  useGameStore.setState({ currentNodeIndex: 5 });
  useGameStore.getState().advanceToNextNode();
  assert.equal(useGameStore.getState().stickerFlow?.items[0].creature, 'princess');
  assert.equal(useGameStore.getState().princessGuaranteed, true);
  useGameStore.getState().discardCurrentSticker();
  assert.equal(useGameStore.getState().currentNodeIndex, 6);
  assert.equal(useGameStore.getState().stickerFlow, null);
});
