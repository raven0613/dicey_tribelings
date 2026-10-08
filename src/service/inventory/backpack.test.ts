import assert from 'node:assert/strict';
import test from 'node:test';
import { INVENTORY_CONFIG } from '../../configs/inventoryConfig';
import { INITIAL_DICE_POOL } from '../../configs/creatures/initialDiceConfig';
import { createPermanentSticker } from '../../configs/creatures/creatureStickerConfig';
import { createOwnedSticker, initializeFaceStickers, sortStickers } from './stickerInstances';
import { placePermanent, takePermanent } from './backpack';

function fixture() {
  const dicePool = initializeFaceStickers(structuredClone(INITIAL_DICE_POOL));
  const die = dicePool[0];
  const faceIndex = die.faces.findIndex((face) => face.creature !== 'blank');
  const sticker = createOwnedSticker({ ...createPermanentSticker('warrior'), material: 'foil' });
  return { dicePool, die, faceIndex, sticker };
}

test('taking a starter sticker preserves its identity and leaves a plain face with its original pips', () => {
  const { dicePool, die, faceIndex } = fixture();
  const original = die.faces[faceIndex];
  const result = takePermanent(dicePool, [], die.id, faceIndex)!;
  assert.equal(result.dicePool[0].faces[faceIndex].creature, 'blank');
  assert.equal(result.dicePool[0].faces[faceIndex].baseValue, original.baseValue);
  assert.equal(result.permanentStickers[0].instanceId, original.stickerIdentity!.instanceId);
  assert.equal(result.permanentStickers[0].acquiredAt, original.stickerIdentity!.acquiredAt);
  assert.equal(takePermanent(result.dicePool, result.permanentStickers, die.id, faceIndex), null);
});

test('a full backpack allows an exchange but rejects a removal or a new sticker that displaces an old one', () => {
  const { dicePool, die, faceIndex, sticker } = fixture();
  const bag = Array.from({ length: INVENTORY_CONFIG.permanentCapacity }, () =>
    createOwnedSticker(createPermanentSticker('family')),
  );
  assert.equal(takePermanent(dicePool, bag, die.id, faceIndex), null);
  assert.equal(placePermanent(dicePool, bag, sticker, die.id, faceIndex), null);
  const result = placePermanent(dicePool, bag, bag[0], die.id, faceIndex)!;
  assert.equal(result.permanentStickers.length, INVENTORY_CONFIG.permanentCapacity);
  assert.equal(
    result.permanentStickers.some((item) => item.instanceId === bag[0].instanceId),
    false,
  );
});

test('material and original acquisition time travel with a sticker through repeated placement', () => {
  const { dicePool, die, faceIndex, sticker } = fixture();
  const placed = placePermanent(dicePool, [sticker], sticker, die.id, faceIndex)!;
  const taken = takePermanent(placed.dicePool, placed.permanentStickers, die.id, faceIndex)!;
  const returned = taken.permanentStickers.find((item) => item.instanceId === sticker.instanceId)!;
  assert.equal(returned.material, sticker.material);
  assert.equal(returned.acquiredAt, sticker.acquiredAt);
  assert.equal(returned.acquisitionOrder, sticker.acquisitionOrder);
  assert.equal(taken.dicePool[0].faces[faceIndex].material, undefined);
});

test('time sorting is newest first with stable ordering for simultaneous acquisitions', () => {
  const first = createOwnedSticker(createPermanentSticker('family'));
  const second = {
    ...createOwnedSticker(createPermanentSticker('family')),
    acquiredAt: first.acquiredAt,
  };
  assert.deepEqual(
    sortStickers([first, second], 'time').map((item) => item.instanceId),
    [second.instanceId, first.instanceId],
  );
  assert.deepEqual(
    sortStickers([first, second], 'name').map((item) => item.instanceId),
    [second.instanceId, first.instanceId],
  );
});
