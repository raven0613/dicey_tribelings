import assert from 'node:assert/strict';
import test from 'node:test';
import { useGameStore } from '../gameStore';
import { createPermanentSticker } from '../../configs/creatures/creatureStickerConfig';
import { REWARD_CONFIG } from '../../configs/rewardConfig';
import { createOwnedSticker } from '../../service/inventory/stickerInstances';

function fixture() {
  useGameStore.getState().restartGame();
  const sticker = createOwnedSticker(createPermanentSticker('family'));
  useGameStore.setState({
    stickerFlow: {
      items: [sticker],
      index: -1,
      completion: 'stay',
      rewardGold: REWARD_CONFIG.skipGold.normal,
    },
  });
  useGameStore.getState().chooseFlowSticker(0);
  return sticker;
}

test('claiming the final sticker holds the editor until configuration is completed', () => {
  const sticker = fixture();
  const state = useGameStore.getState();
  const die = state.dicePool[0];
  const index = die.faces.findIndex((face) => face.creature === 'blank');
  assert.equal(state.applyCurrentSticker(die.id, index), true);
  const claimed = useGameStore.getState();
  assert.deepEqual(claimed.stickerFlow?.items, []);
  assert.equal(claimed.stickerFlow?.editing, true);
  assert.equal(claimed.stickerFlow?.usedAny, true);
  assert.equal(claimed.takeFaceSticker(die.id, index), true);
  assert.equal(useGameStore.getState().permanentStickers[0].instanceId, sticker.instanceId);
  claimed.returnToStickerSelection();
  assert.equal(useGameStore.getState().stickerFlow, null);
  assert.equal(useGameStore.getState().gold, state.gold);
});

test('editing existing stickers preserves the unclaimed reward and its compensation eligibility', () => {
  const sticker = fixture();
  const state = useGameStore.getState();
  const die = state.dicePool[0];
  const index = die.faces.findIndex((face) => face.creature !== 'blank');
  assert.equal(state.takeFaceSticker(die.id, index), true);
  const owned = useGameStore.getState().permanentStickers[0];
  assert.equal(state.placeInventorySticker(owned.instanceId, die.id, index), true);
  assert.deepEqual(useGameStore.getState().stickerFlow?.items, [sticker]);
  state.returnToStickerSelection();
  assert.equal(useGameStore.getState().stickerFlow?.editing, false);
  state.skipStickerFlow();
  assert.equal(useGameStore.getState().gold, state.gold + REWARD_CONFIG.skipGold.normal);
});

test('storing from the editor keeps it open while storing from selection completes the flow', () => {
  fixture();
  const state = useGameStore.getState();
  assert.equal(state.storeFlowSticker(0), true);
  assert.equal(useGameStore.getState().stickerFlow?.editing, true);
  assert.equal(useGameStore.getState().applyCurrentSticker(state.dicePool[0].id, 0), false);
  state.returnToStickerSelection();
  assert.equal(useGameStore.getState().stickerFlow, null);
  fixture();
  useGameStore.getState().returnToStickerSelection();
  assert.equal(useGameStore.getState().storeFlowSticker(0), true);
  assert.equal(useGameStore.getState().stickerFlow, null);
});

test('final reward advances exactly once after completing configuration', (context) => {
  fixture();
  const state = useGameStore.getState();
  const advance = context.mock.fn();
  context.after(() => useGameStore.setState({ advanceToNextNode: state.advanceToNextNode }));
  useGameStore.setState({
    stickerFlow: { ...state.stickerFlow!, completion: 'advance' },
    advanceToNextNode: advance,
  });
  state.storeFlowSticker(0);
  assert.equal(advance.mock.callCount(), 0);
  state.returnToStickerSelection();
  assert.equal(advance.mock.callCount(), 1);
  state.returnToStickerSelection();
  assert.equal(advance.mock.callCount(), 1);
});
