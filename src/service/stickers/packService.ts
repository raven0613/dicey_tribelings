import { rollMaterialTier, assignRewardMaterial } from '../rewards/materialRewards';
import { CREATURE_BALANCE } from '../../configs/creatures/creatureBalanceConfig';
import type { StickerItem } from '../../types/game';
import type { RegionId } from '../../types/enemy';
import { createPermanentSticker, DISPOSABLE_STICKERS } from '../../configs/creatures/creatureStickerConfig';
import { STICKER_PACKS_CATALOG } from '../../configs/stickerPacksConfig';
import { takeWeighted } from '../rewards/rewardSampling';

export interface PackOpenResult { packName: string; stickers: StickerItem[] }
export function openStickerPack(packId: string, region: RegionId,
  random: () => number = Math.random, princessCount = 0): PackOpenResult {
  const materialTier = rollMaterialTier(random);
  const pack = STICKER_PACKS_CATALOG.find((item) => item.id === packId)!;
  const permanent = pack.creatures.map((creature) => createPermanentSticker(creature, region));
  const disposable = DISPOSABLE_STICKERS.filter((item) => pack.creatures.some((creature) => creature === item.creature));
  const stickers: StickerItem[] = [];
  for (let index = 0; index < pack.stickerCount; index++) {
    const item = index < pack.permanentCount ? takeWeighted(permanent, random) : takeWeighted(disposable, random);
    if (item) stickers.push(item);
  }
  if (pack.id === 'pack_royal' && princessCount < CREATURE_BALANCE.princess.packLimit
    && random() < CREATURE_BALANCE.princess.packChance) stickers[0] = createPermanentSticker('princess', region);
  return { packName: pack.name, stickers: assignRewardMaterial(stickers, materialTier, random) };
}
