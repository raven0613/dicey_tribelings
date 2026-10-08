import assert from 'node:assert/strict';
import test from 'node:test';
import { useGameStore } from '../gameStore';
import {
  DISPOSABLE_STICKERS,
  createPermanentSticker,
} from '../../configs/creatures/creatureStickerConfig';
import { createOwnedSticker } from '../../service/inventory/stickerInstances';
import { INITIAL_MAP_NODES } from '../../configs/regions/mapConfig';
import { REWARD_CONFIG } from '../../configs/rewardConfig';
import { INVENTORY_CONFIG } from '../../configs/inventoryConfig';

test('temporary purchases can be preconfigured in a shop, survive travel and are consumed exactly at battle entry', () => {
  useGameStore.getState().restartGame();
  const shop = INITIAL_MAP_NODES.find((node) => node.type === 'shop')!;
  useGameStore.getState().startNode(shop.id);
  const sticker = DISPOSABLE_STICKERS[0];
  useGameStore.setState({ shopStickers: [sticker], gold: sticker.cost! });
  useGameStore.getState().buyShopSticker(sticker.id);
  const state = useGameStore.getState(),
    die = state.dicePool[0];
  const faceIndex = die.faces.findIndex((face) => face.creature !== 'blank');
  state.chooseFlowSticker(0);
  assert.equal(useGameStore.getState().applyCurrentSticker(die.id, faceIndex), true);
  assert.equal(useGameStore.getState().temporaryPlacements.length, 1);
  assert.equal(useGameStore.getState().consumableStickers.length, 1);
  useGameStore.getState().startNode(INITIAL_MAP_NODES.find((node) => node.type === 'fight')!.id);
  assert.equal(useGameStore.getState().temporaryPlacements.length, 1);
  useGameStore.getState().confirmBattlePreparation();
  assert.equal(useGameStore.getState().consumableStickers.length, 0);
  assert.equal(useGameStore.getState().temporaryPlacements.length, 0);
  assert.equal(
    useGameStore.getState().dicePool[0].faces[faceIndex].temporarySticker?.creature,
    sticker.creature,
  );
  assert.equal(useGameStore.getState().takeFaceSticker(die.id, faceIndex), false);
});

test('taking a covered face returns the temporary layer before its permanent sticker', () => {
  useGameStore.getState().restartGame();
  const sticker = DISPOSABLE_STICKERS[0];
  useGameStore.setState({ shopStickers: [sticker], gold: sticker.cost! });
  useGameStore.getState().buyShopSticker(sticker.id);
  useGameStore.getState().storeFlowSticker(0);
  const state = useGameStore.getState(),
    die = state.dicePool[0];
  const faceIndex = die.faces.findIndex((face) => face.creature !== 'blank');
  state.placeInventorySticker(state.consumableStickers[0].instanceId, die.id, faceIndex);
  assert.equal(useGameStore.getState().takeFaceSticker(die.id, faceIndex), true);
  assert.equal(useGameStore.getState().permanentStickers.length, 0);
  assert.equal(useGameStore.getState().consumableStickers.length, 1);
  assert.equal(useGameStore.getState().takeFaceSticker(die.id, faceIndex), true);
  assert.equal(useGameStore.getState().permanentStickers.length, 1);
});

test('storing part of a reward removes eligibility for whole-bundle gold and preserves acquisition identity', () => {
  useGameStore.getState().restartGame();
  const first = createOwnedSticker(createPermanentSticker('family'));
  const second = createOwnedSticker(createPermanentSticker('warrior'));
  const gold = useGameStore.getState().gold;
  useGameStore.setState({
    stickerFlow: {
      items: [first, second],
      index: -1,
      completion: 'stay',
      rewardGold: REWARD_CONFIG.skipGold.normal,
    },
  });
  assert.equal(useGameStore.getState().storeFlowSticker(0), true);
  useGameStore.getState().skipStickerFlow();
  assert.equal(useGameStore.getState().gold, gold);
  assert.deepEqual(useGameStore.getState().permanentStickers, [first]);
});

test('a full bag preserves an unclaimed reward and battle phases reject inventory mutations', () => {
  useGameStore.getState().restartGame();
  const sticker = createOwnedSticker(createPermanentSticker('family'));
  const bag = Array.from({ length: INVENTORY_CONFIG.permanentCapacity }, () =>
    createOwnedSticker(createPermanentSticker('warrior')),
  );
  const flow = { items: [sticker], index: -1, completion: 'stay' as const };
  useGameStore.setState({ permanentStickers: bag, stickerFlow: flow });
  assert.equal(useGameStore.getState().storeFlowSticker(0), false);
  assert.equal(useGameStore.getState().stickerFlow, flow);
  for (const combatPhase of [
    'ROLLING',
    'CONTROL_PHASE',
    'RESOLVING_CALCULATION',
    'RESOLVING_ATTACK',
    'ENEMY_TURN',
    'DEFEAT',
  ] as const) {
    useGameStore.setState({ combatPhase });
    const state = useGameStore.getState();
    state.discardInventorySticker(bag[0].instanceId);
    assert.equal(useGameStore.getState().permanentStickers, bag);
    assert.equal(state.placeInventorySticker(bag[0].instanceId, state.dicePool[0].id, 0), false);
  }
});

test('inventory exchanges return the old permanent, withdraw a temporary cover, and keep a full bag at capacity', () => {
  useGameStore.getState().restartGame();
  const temporary = DISPOSABLE_STICKERS[0];
  useGameStore.setState({ shopStickers: [temporary], gold: temporary.cost! });
  useGameStore.getState().buyShopSticker(temporary.id);
  useGameStore.getState().storeFlowSticker(0);
  const before = useGameStore.getState(),
    die = before.dicePool[0];
  const faceIndex = die.faces.findIndex((face) => face.creature !== 'blank');
  before.placeInventorySticker(before.consumableStickers[0].instanceId, die.id, faceIndex);
  const bag = Array.from({ length: INVENTORY_CONFIG.permanentCapacity }, () =>
    createOwnedSticker(createPermanentSticker('warrior')),
  );
  useGameStore.setState({ permanentStickers: bag });
  assert.equal(
    useGameStore.getState().placeInventorySticker(bag[0].instanceId, die.id, faceIndex),
    true,
  );
  const after = useGameStore.getState();
  assert.equal(after.temporaryPlacements.length, 0);
  assert.equal(after.consumableStickers.length, before.consumableStickers.length);
  assert.equal(after.permanentStickers.length, INVENTORY_CONFIG.permanentCapacity);
  assert.equal(
    after.permanentStickers.at(-1)!.instanceId,
    die.faces[faceIndex].stickerIdentity!.instanceId,
  );
  after.discardInventorySticker(after.permanentStickers[0].instanceId);
  assert.equal(
    useGameStore.getState().permanentStickers.length,
    INVENTORY_CONFIG.permanentCapacity - 1,
  );
});

test('directly received permanent stickers can fill a blank face even when the bag is full', () => {
  useGameStore.getState().restartGame();
  const state = useGameStore.getState(),
    die = state.dicePool[0];
  const blankIndex = die.faces.findIndex((face) => face.creature === 'blank');
  const sticker = createOwnedSticker(createPermanentSticker('warrior'));
  const bag = Array.from({ length: INVENTORY_CONFIG.permanentCapacity }, () =>
    createOwnedSticker(createPermanentSticker('family')),
  );
  useGameStore.setState({
    permanentStickers: bag,
    stickerFlow: { items: [sticker], index: 0, completion: 'stay' },
  });
  assert.equal(useGameStore.getState().applyCurrentSticker(die.id, blankIndex), true);
  assert.equal(
    useGameStore.getState().permanentStickers.length,
    INVENTORY_CONFIG.permanentCapacity,
  );
  assert.equal(
    useGameStore.getState().dicePool[0].faces[blankIndex].stickerIdentity!.instanceId,
    sticker.instanceId,
  );
});
