import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { createPermanentSticker } from '../../configs/creatures/creatureStickerConfig';
import { isArrowFace } from '../../configs/directionalStickerConfig';
import type { PermanentCreatureId } from '../../types/creatures';
import type {
  Dice,
  DiceFace,
  StickerItem,
  StickerInstanceIdentity,
  OwnedPermanentSticker,
  StickerSort,
} from '../../types/game';

let acquisitionSequence = 0;

export function createStickerIdentity(
  instanceId: string = crypto.randomUUID(),
): StickerInstanceIdentity {
  return { instanceId, acquiredAt: Date.now(), acquisitionOrder: ++acquisitionSequence };
}

export function createOwnedSticker<T extends StickerItem>(sticker: T): T & StickerInstanceIdentity {
  return 'instanceId' in sticker
    ? (sticker as T & StickerInstanceIdentity)
    : { ...sticker, ...createStickerIdentity() };
}

export function initializeFaceStickers(pool: Dice[]): Dice[] {
  return pool.map((die) => ({
    ...die,
    faces: die.faces.map((face) => ({
      ...face,
      stickerIdentity:
        face.creature === 'blank' || isArrowFace(face.creature)
          ? undefined
          : (face.stickerIdentity ?? createStickerIdentity()),
    })),
  }));
}

export function getFaceSticker(face: DiceFace): OwnedPermanentSticker | null {
  if (face.creature === 'blank' || isArrowFace(face.creature)) return null;
  return {
    ...createPermanentSticker(face.creature as PermanentCreatureId),
    material: face.material,
    ...face.stickerIdentity!,
  };
}

export function sortStickers<
  T extends StickerInstanceIdentity & { creature: string; name: string },
>(items: readonly T[], sort: StickerSort): T[] {
  const name = (item: T) =>
    CREATURE_CONFIG[item.creature as keyof typeof CREATURE_CONFIG]?.name ?? item.name;
  return [...items].sort(
    (a, b) =>
      (sort === 'name' ? name(a).localeCompare(name(b), 'zh-Hant') : 0) ||
      b.acquiredAt - a.acquiredAt ||
      b.acquisitionOrder - a.acquisitionOrder,
  );
}
