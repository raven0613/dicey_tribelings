import {
  ConsumableSticker,
  Dice,
  DisposableSticker,
  PermanentSticker,
  TemporarySticker,
  TemporaryStickerPlacement,
} from '../../types/game';

export function createConsumableSticker(sticker: DisposableSticker, instanceId: string): ConsumableSticker {
  return {
    instanceId,
    stickerId: sticker.id,
    name: sticker.name,
    creature: sticker.creature,
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
  sticker: PermanentSticker
): Dice[] {
  return dicePool.map((die) => {
    if (die.id !== diceId || !die.faces[faceIndex]) return die;
    const faces = [...die.faces];
    faces[faceIndex] = {
      ...faces[faceIndex],
      baseValue: sticker.baseValue,
      material: sticker.material,
      materialDecay: undefined,
      creature: sticker.creature,
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
        creature: placement.consumable.creature,
        description: placement.consumable.description,
      };
      return { ...face, temporarySticker };
    }),
  }));
}

export function restoreTemporaryStickers(dicePool: Dice[]): Dice[] {
  return dicePool.map((die) => ({
    ...die,
    faces: die.faces.map(({ temporarySticker: _temporarySticker, materialDecay: _materialDecay, ...face }) => face),
  }));
}

export function validateTemporaryPlacements(dicePool: Dice[], inventory: ConsumableSticker[],
  placements: TemporaryStickerPlacement[]): boolean {
  const faces = new Set(placements.map((item) => `${item.diceId}:${item.faceIndex}`));
  const instances = new Set(placements.map((item) => item.consumable.instanceId));
  return faces.size === placements.length && instances.size === placements.length
    && placements.every((item) => inventory.some((owned) => owned.instanceId === item.consumable.instanceId)
      && Boolean(dicePool.find((die) => die.id === item.diceId)?.faces[item.faceIndex]));
}
