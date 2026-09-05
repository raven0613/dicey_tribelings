import {
  ConsumableSticker,
  Dice,
  StickerItem,
  TemporarySticker,
  TemporaryStickerPlacement,
} from '../../types/game';

export function createConsumableSticker(sticker: StickerItem, instanceId: string): ConsumableSticker {
  return {
    instanceId,
    stickerId: sticker.id,
    name: sticker.name,
    baseValue: sticker.baseValue,
    element: sticker.element,
    special: sticker.special,
    description: sticker.description,
    rarity: sticker.rarity,
  };
}

export function replaceConsumable(
  inventory: ConsumableSticker[],
  replacedInstanceId: string,
  incoming: ConsumableSticker
): ConsumableSticker[] {
  return inventory.map((item) => (item.instanceId === replacedInstanceId ? incoming : item));
}

export function removeConsumables(
  inventory: ConsumableSticker[],
  consumedInstanceIds: string[]
): ConsumableSticker[] {
  const consumedIds = new Set(consumedInstanceIds);
  return inventory.filter((item) => !consumedIds.has(item.instanceId));
}

export function applyPermanentSticker(
  dicePool: Dice[],
  diceId: string,
  faceIndex: number,
  sticker: StickerItem
): Dice[] {
  return dicePool.map((die) => {
    if (die.id !== diceId || !die.faces[faceIndex]) return die;
    const faces = [...die.faces];
    faces[faceIndex] = {
      ...faces[faceIndex],
      baseValue: sticker.baseValue,
      element: sticker.element,
      special: sticker.special,
      temporarySticker: undefined,
    };
    return { ...die, faces };
  });
}

export function applyTemporaryPlacements(
  dicePool: Dice[],
  placements: TemporaryStickerPlacement[]
): Dice[] {
  const placementsByFace = new Map(
    placements.map((placement) => [`${placement.diceId}:${placement.faceIndex}`, placement])
  );

  return dicePool.map((die) => ({
    ...die,
    faces: die.faces.map((face, faceIndex) => {
      const placement = placementsByFace.get(`${die.id}:${faceIndex}`);
      if (!placement) return face;
      const temporarySticker: TemporarySticker = {
        name: placement.consumable.name,
        baseValue: placement.consumable.baseValue,
        element: placement.consumable.element,
        special: placement.consumable.special,
        description: placement.consumable.description,
      };
      return { ...face, temporarySticker };
    }),
  }));
}

export function restoreTemporaryStickers(dicePool: Dice[]): Dice[] {
  return dicePool.map((die) => ({
    ...die,
    faces: die.faces.map(({ temporarySticker: _temporarySticker, ...face }) => face),
  }));
}
