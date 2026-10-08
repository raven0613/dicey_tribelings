import assert from 'node:assert/strict';
import test from 'node:test';
import { useGameStore } from '../gameStore';
import { INVENTORY_CONFIG } from '../../configs/inventoryConfig';
import {
  DISPOSABLE_STICKERS,
  createPermanentSticker,
} from '../../configs/creatures/creatureStickerConfig';
import { ARROW_IDS } from '../../configs/directionalStickerConfig';
import { createConsumableSticker } from '../../service/inventory/inventoryService';
import { createOwnedSticker } from '../../service/inventory/stickerInstances';
import { getArrowTarget } from '../../service/dice/directionalFaces';

function fixture() {
  useGameStore.getState().restartGame();
  const [source, target] = useGameStore.getState().dicePool;
  const from = source.faces.findIndex((face) => face.creature !== 'blank');
  const to = target.faces.findIndex((face) => face.creature !== 'blank');
  return { source, target, from, to };
}

test('face exchange preserves identity, material and fixed pips with a full backpack', () => {
  const { source, target, from, to } = fixture();
  const state = useGameStore.getState();
  const pool = state.dicePool.map((die) => ({
    ...die,
    faces: die.faces.map((face, index) =>
      die.id === source.id && index === from ? { ...face, material: 'foil' as const } : face,
    ),
  }));
  const bag = Array.from({ length: INVENTORY_CONFIG.permanentCapacity }, () =>
    createOwnedSticker(createPermanentSticker('family')),
  );
  useGameStore.setState({ dicePool: pool, permanentStickers: bag });
  assert.equal(state.moveFaceSticker(source.id, from, target.id, to), true);
  const after = useGameStore.getState();
  const left = after.dicePool[0].faces[from],
    right = after.dicePool[1].faces[to];
  assert.deepEqual(left.stickerIdentity, target.faces[to].stickerIdentity);
  assert.deepEqual(right.stickerIdentity, source.faces[from].stickerIdentity);
  assert.equal(right.material, 'foil');
  assert.equal(left.baseValue, source.faces[from].baseValue);
  assert.equal(right.baseValue, target.faces[to].baseValue);
  assert.equal(left.id, source.faces[from].id);
  assert.equal(right.id, target.faces[to].id);
  assert.equal(after.permanentStickers, bag);
});

test('moving to a blank face clears the source and dropping on itself leaves state untouched', () => {
  const { source, from } = fixture();
  const to = source.faces.findIndex((face) => face.creature === 'blank');
  const state = useGameStore.getState();
  assert.equal(state.moveFaceSticker(source.id, from, source.id, from), true);
  assert.equal(useGameStore.getState().dicePool, state.dicePool);
  assert.equal(state.moveFaceSticker(source.id, from, source.id, to), true);
  const die = useGameStore.getState().dicePool[0];
  assert.deepEqual(die.faces[from], {
    id: source.faces[from].id,
    baseValue: source.faces[from].baseValue,
    creature: 'blank',
  });
  assert.deepEqual(die.faces[to].stickerIdentity, source.faces[from].stickerIdentity);
});

test('temporary stickers exchange their layer and overlay permanent targets', () => {
  const { source, target, from, to } = fixture();
  const first = createConsumableSticker(DISPOSABLE_STICKERS[0], 'first');
  const second = createConsumableSticker(DISPOSABLE_STICKERS[1], 'second');
  useGameStore.setState({
    consumableStickers: [first, second],
    temporaryPlacements: [
      { consumable: first, diceId: source.id, faceIndex: from },
      { consumable: second, diceId: target.id, faceIndex: to },
    ],
  });
  const state = useGameStore.getState();
  assert.equal(state.moveFaceSticker(source.id, from, target.id, to), true);
  let after = useGameStore.getState();
  assert.equal(after.dicePool, state.dicePool);
  assert.equal(after.temporaryPlacements.find((p) => p.diceId === source.id)!.consumable, second);
  assert.equal(after.temporaryPlacements.find((p) => p.diceId === target.id)!.consumable, first);
  const empty = target.faces.findIndex((_, i) => i !== to);
  assert.equal(after.moveFaceSticker(target.id, to, target.id, empty), true);
  after = useGameStore.getState();
  assert.equal(
    after.temporaryPlacements.some((p) => p.diceId === target.id && p.faceIndex === to),
    false,
  );
  assert.equal(after.dicePool, state.dicePool);
  assert.deepEqual(after.consumableStickers, [first, second]);
});

test('permanent exchange withdraws the destination cover into its reserved inventory slot', () => {
  const { source, target, from, to } = fixture();
  const temporary = createConsumableSticker(DISPOSABLE_STICKERS[0], 'cover');
  useGameStore.setState({
    consumableStickers: [temporary],
    temporaryPlacements: [{ consumable: temporary, diceId: target.id, faceIndex: to }],
  });
  assert.equal(useGameStore.getState().moveFaceSticker(source.id, from, target.id, to), true);
  const state = useGameStore.getState();
  assert.deepEqual(state.temporaryPlacements, []);
  assert.deepEqual(state.consumableStickers, [temporary]);
  assert.deepEqual(state.dicePool[0].faces[from].stickerIdentity, target.faces[to].stickerIdentity);
});

test('an arrow move that points at another arrow is rejected atomically', () => {
  const { source } = fixture();
  const arrow = DISPOSABLE_STICKERS.find((item) => item.creature === 'directional')!;
  const first = createConsumableSticker(arrow, 'arrow-a');
  const second = createConsumableSticker(arrow, 'arrow-b');
  const direction = ARROW_IDS[0];
  const destination = 0;
  const neighbor = getArrowTarget(source, destination, direction);
  const start = source.faces.findIndex(
    (_, i) =>
      i !== destination && i !== neighbor && getArrowTarget(source, i, direction) !== neighbor,
  );
  const otherDirection = ARROW_IDS.find(
    (dir) => ![start, destination].includes(getArrowTarget(source, neighbor, dir)),
  )!;
  useGameStore.setState({
    consumableStickers: [first, second],
    temporaryPlacements: [
      { consumable: first, diceId: source.id, faceIndex: start, direction },
      { consumable: second, diceId: source.id, faceIndex: neighbor, direction: otherDirection },
    ],
  });
  const state = useGameStore.getState();
  assert.equal(state.moveFaceSticker(source.id, start, source.id, destination), false);
  assert.equal(useGameStore.getState().temporaryPlacements, state.temporaryPlacements);
  assert.equal(useGameStore.getState().dicePool, state.dicePool);
});

test('combat phases reject face transfers', () => {
  const { source, target, from, to } = fixture();
  useGameStore.setState({ combatPhase: 'CONTROL_PHASE' });
  const state = useGameStore.getState();
  assert.equal(state.moveFaceSticker(source.id, from, target.id, to), false);
  assert.equal(useGameStore.getState().dicePool, state.dicePool);
});
