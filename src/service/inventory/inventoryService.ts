import { getArrowConfigurationError } from '../dice/directionalFaces';
import { ARROW_CONFIG, ARROW_DESCRIPTION, ARROW_IDS } from '../../configs/directionalStickerConfig';
import type { ArrowId } from '../../types/creatures';
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
      const temporarySticker = resolveTemporarySticker(placement.consumable, placement.direction);
      return { ...face, temporarySticker };
    }),
  }));
}

export function resolveTemporarySticker(sticker: Pick<ConsumableSticker, 'creature' | 'name' | 'description'>, direction?: ArrowId): TemporarySticker {
  if (sticker.creature === 'directional') return {
    creature: direction!, name: ARROW_CONFIG[direction!].name, description: ARROW_DESCRIPTION,
  };
  return { creature: sticker.creature, name: sticker.name, description: sticker.description };
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
  const valid = faces.size === placements.length && instances.size === placements.length
    && placements.every((item) => inventory.some((owned) => owned.instanceId === item.consumable.instanceId)
      && Boolean(dicePool.find((die) => die.id === item.diceId)?.faces[item.faceIndex]));
  if (!valid) return false;
  const owned = placements.map((item) => ({ ...item, consumable: inventory.find((entry) => entry.instanceId === item.consumable.instanceId)! }));
  if (owned.some((item) => item.consumable.creature === 'directional'
    ? !item.direction || !ARROW_IDS.includes(item.direction) : item.direction !== undefined)) return false;
  return getArrowConfigurationError(applyTemporaryPlacements(dicePool, owned)) === null;
}
