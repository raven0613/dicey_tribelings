import { StickerItem, Dice } from '../../types/game';
import { openStickerPack, STICKER_PACKS_CATALOG } from '../../configs/stickerPacksConfig';
import { PROGRESSION_DICE_REWARDS } from '../../configs/diceProgressionConfig';

export interface PackOpenResult {
  packName: string;
  stickers: StickerItem[];
  disposableAdded: StickerItem[];
  permanentStickers: StickerItem[];
}

export function processOpenPack(
  packId: string,
  currentConsumables: StickerItem[],
  maxConsumables = 3
): {
  result: PackOpenResult;
  updatedConsumables: StickerItem[];
} {
  const pack = STICKER_PACKS_CATALOG.find((p) => p.id === packId) || STICKER_PACKS_CATALOG[0];
  const rolledStickers = openStickerPack(packId);

  const updatedConsumables = [...currentConsumables];
  const disposableAdded: StickerItem[] = [];
  const permanentStickers: StickerItem[] = [];

  for (const s of rolledStickers) {
    if (s.isDisposable) {
      if (updatedConsumables.length < maxConsumables) {
        updatedConsumables.push(s);
        disposableAdded.push(s);
      }
    } else {
      permanentStickers.push(s);
    }
  }

  return {
    result: {
      packName: pack.name,
      stickers: rolledStickers,
      disposableAdded,
      permanentStickers,
    },
    updatedConsumables,
  };
}

export function checkProgressionDiceReward(completedNodeIndex: number, currentDicePool: Dice[]): Dice | null {
  const candidate = PROGRESSION_DICE_REWARDS[completedNodeIndex];
  if (!candidate) return null;
  const alreadyHas = currentDicePool.some((d) => d.id === candidate.id);
  if (alreadyHas) return null;
  return candidate;
}
