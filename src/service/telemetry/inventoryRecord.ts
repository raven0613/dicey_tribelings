import type { GameState } from '../../store/gameStore.types';
import type { ConsumableSticker, OwnedSticker } from '../../types/game';
import { getFaceSticker } from '../inventory/stickerInstances';
import type { RecordedItem, StickerChange, StickerPosition } from './decisionTypes';

type InventoryState = Pick<
  GameState,
  'dicePool' | 'permanentStickers' | 'consumableStickers' | 'temporaryPlacements' | 'stickerFlow'
>;
export const stickerItem = (item: OwnedSticker | ConsumableSticker): RecordedItem => ({
  ...item,
  id: 'stickerId' in item ? item.stickerId : item.id,
});
function positions(state: InventoryState) {
  const result = new Map<string, { item: RecordedItem; position: StickerPosition }>();
  const add = (item: OwnedSticker | ConsumableSticker, position: StickerPosition) =>
    result.set(item.instanceId, { item: stickerItem(item), position });
  for (const item of state.stickerFlow?.items ?? []) add(item, { kind: 'pending' });
  for (const item of state.permanentStickers) add(item, { kind: 'permanentBag' });
  for (const item of state.consumableStickers) add(item, { kind: 'temporaryBag' });
  for (const die of state.dicePool)
    die.faces.forEach((face, faceIndex) => {
      if (!face.stickerIdentity) return;
      const item = getFaceSticker(face);
      if (item) add(item, { kind: 'face', diceId: die.id, diceName: die.name, faceIndex });
    });
  for (const placement of state.temporaryPlacements)
    add(placement.consumable, {
      kind: 'temporaryFace',
      diceId: placement.diceId,
      diceName: state.dicePool.find((die) => die.id === placement.diceId)!.name,
      faceIndex: placement.faceIndex,
      direction: placement.direction,
    });
  return result;
}
export function inventoryChanges(before: InventoryState, after: InventoryState): StickerChange[] {
  const previous = positions(before),
    next = positions(after);
  return [...new Set([...previous.keys(), ...next.keys()])].flatMap((id) => {
    const from = previous.get(id),
      to = next.get(id);
    if (JSON.stringify(from?.position) === JSON.stringify(to?.position)) return [];
    return [{ item: (to ?? from)!.item, from: from?.position ?? null, to: to?.position ?? null }];
  });
}
