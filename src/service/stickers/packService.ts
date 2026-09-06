import { CREATURE_BALANCE } from '../../configs/creatures/creatureBalanceConfig';
import { Dice, StickerItem } from '../../types/game';
import { ALL_STICKERS_CATALOG } from '../../configs/gameConfig';
import { PROGRESSION_DICE_REWARDS } from '../../configs/diceProgressionConfig';
import { STICKER_PACKS_CATALOG } from '../../configs/stickerPacksConfig';

export interface PackOpenResult {
  packName: string;
  stickers: StickerItem[];
}

export function openStickerPack(packId: string, random: () => number = Math.random, princessCount = 0): PackOpenResult {
  const pack = STICKER_PACKS_CATALOG.find((candidate) => candidate.id === packId)!;
  const configuredPool = pack.stickerIds.map((id) => ALL_STICKERS_CATALOG.find((item) => item.id === id)!)
    .filter((item) => item.creature !== 'princess');
  const available = [...configuredPool];
  const stickers: StickerItem[] = [];
  const take = (disposable?: boolean) => {
    const choices = available.filter((item) => disposable === undefined || item.isDisposable === disposable);
    if (!choices.length) return;
    const item = choices[Math.floor(random() * choices.length)];
    stickers.push(item);
    available.splice(available.indexOf(item), 1);
  };
  take(false); take(true);
  while (stickers.length < pack.stickerCount && available.length) take();
  if (pack.id === 'pack_royal' && princessCount < CREATURE_BALANCE.princess.packLimit
    && random() < CREATURE_BALANCE.princess.packChance) {
    const princess = ALL_STICKERS_CATALOG.find((item) => item.creature === 'princess')!;
    stickers[0] = princess;
  }
  return { packName: pack.name, stickers };
}

export function checkProgressionDiceReward(completedNodeIndex: number, currentDicePool: Dice[]): Dice | null {
  const candidate = PROGRESSION_DICE_REWARDS[completedNodeIndex];
  if (!candidate || currentDicePool.some((die) => die.id === candidate.id)) return null;
  return structuredClone(candidate);
}
