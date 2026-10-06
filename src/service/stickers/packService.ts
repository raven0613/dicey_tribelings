import { rollMaterialTier, assignRewardMaterial } from '../rewards/materialRewards';
import { CREATURE_BALANCE } from '../../configs/creatures/creatureBalanceConfig';
import type { PermanentSticker } from '../../types/game';
import { createPermanentSticker } from '../../configs/creatures/creatureStickerConfig';
import { STICKER_PACKS_CATALOG } from '../../configs/stickerPacksConfig';
import { takeWeighted } from '../rewards/rewardSampling';

export interface PackOpenResult { packName: string; stickers: PermanentSticker[] }
export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function openStickerPack(packId: string,
  random: () => number = Math.random, princessCount = 0, withMaterial = true): PackOpenResult {
  const pack = STICKER_PACKS_CATALOG.find(item => item.id === packId)!;
  const stickers = pack.slots.map(pool => takeWeighted(pool.map(createPermanentSticker), random)!);
  if (pack.id === 'pack_royal' && princessCount < CREATURE_BALANCE.princess.packLimit
    && random() < CREATURE_BALANCE.princess.packChance) stickers[stickers.length - 1] = createPermanentSticker('princess');
  return { packName: pack.name, stickers: shuffled(withMaterial ? assignRewardMaterial(stickers, rollMaterialTier(random), random) : stickers, random) };
}
