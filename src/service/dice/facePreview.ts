import type { DiceFace, FaceSticker } from '../../types/game';
import { getEffectiveFace } from './diceFaces';

/** Preserve raw values so material adjustments are applied exactly once. */
export function getPreviewSourceFace(face: DiceFace, sticker?: FaceSticker): DiceFace {
  if (!sticker) return face;
  return sticker.isDisposable === true
    ? { ...face, temporarySticker: { name: sticker.name, creature: sticker.creature, description: sticker.description } }
    : { id: face.id, creature: sticker.creature, baseValue: face.baseValue, material: sticker.material };
}

export const getPreviewFace = (face: DiceFace, sticker?: FaceSticker) => getEffectiveFace(getPreviewSourceFace(face, sticker));
