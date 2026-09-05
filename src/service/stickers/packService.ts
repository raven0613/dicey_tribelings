import { Dice, StickerItem } from '../../types/game';
import { ALL_STICKERS_CATALOG } from '../../configs/gameConfig';
import { PROGRESSION_DICE_REWARDS } from '../../configs/diceProgressionConfig';
import { STICKER_PACKS_CATALOG } from '../../configs/stickerPacksConfig';

export interface PackOpenResult {
  packName: string;
  stickers: StickerItem[];
}

export function openStickerPack(packId: string, random: () => number = Math.random): PackOpenResult {
  const pack = STICKER_PACKS_CATALOG.find((candidate) => candidate.id === packId) ?? STICKER_PACKS_CATALOG[0];
  const configuredPool = pack.stickerIds
    .map((stickerId) => ALL_STICKERS_CATALOG.find((sticker) => sticker.id === stickerId))
    .filter((sticker): sticker is StickerItem => Boolean(sticker));
  const permanentPool = configuredPool.filter((sticker) => !sticker.isDisposable);
  const disposablePool = configuredPool.filter((sticker) => sticker.isDisposable);
  const stickers: StickerItem[] = [];

  const takeSticker = (pool: StickerItem[]) => {
    const available = pool.filter((candidate) => !stickers.some((sticker) => sticker.id === candidate.id));
    if (available.length === 0) return;
    const index = Math.min(available.length - 1, Math.floor(random() * available.length));
    stickers.push(available[index]);
  };

  takeSticker(permanentPool);
  takeSticker(disposablePool);
  while (stickers.length < pack.stickerCount) takeSticker(configuredPool);

  return { packName: pack.name, stickers };
}

export function checkProgressionDiceReward(completedNodeIndex: number, currentDicePool: Dice[]): Dice | null {
  const candidate = PROGRESSION_DICE_REWARDS[completedNodeIndex];
  if (!candidate || currentDicePool.some((die) => die.id === candidate.id)) return null;
  return structuredClone(candidate);
}
