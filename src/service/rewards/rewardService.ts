import { sampleDistinct } from './refreshService';
import { rollMaterialTier, assignRewardMaterial } from './materialRewards';
import type { BattleRewardOption, ChestRewardOption, Equipment, PermanentSticker } from '../../types/game';
import type { RegionId, EnemyRank } from '../../types/enemy';
import { ALL_STICKERS_CATALOG } from '../../configs/creatures/creatureStickerConfig';
import { STICKER_PACKS_CATALOG } from '../../configs/stickerPacksConfig';
import { REWARD_CONFIG } from '../../configs/rewardConfig';
import { takeWeighted } from './rewardSampling';

export function getBattleRewardCount(rank: EnemyRank): number {
  return rank === 'normal' ? REWARD_CONFIG.normalFightPickCount : REWARD_CONFIG.advancedPickCount;
}
export function generateBattleRewardOptions(region: RegionId, rank: EnemyRank,
  random: () => number = Math.random, excluded: readonly string[] = [], optionCount?: number): BattleRewardOption[] {
  const materialTier = rollMaterialTier(random);
  const count = optionCount ?? (rank === 'normal' ? REWARD_CONFIG.normalFightOptionCount : REWARD_CONFIG.advancedOptionCount);
  const available = ALL_STICKERS_CATALOG.filter((item): item is PermanentSticker =>
    item.isDisposable === false && item.region === region && item.creature !== 'princess' && !excluded.includes(`permanent:${item.creature}`));
  const options: BattleRewardOption[] = [];
  while (options.length < count) {
    const sticker = takeWeighted(available, random);
    if (!sticker) break;
    options.push({ id: `sticker:${sticker.id}`, kind: 'sticker', sticker });
  }
  if (rank === 'normal' && random() < REWARD_CONFIG.normalFightStickerPackChance) {
    const pack = sampleDistinct(STICKER_PACKS_CATALOG.filter(pack => !excluded.includes(`pack:${pack.id}`)), 1, random)[0];
    if (pack && options.length) options[Math.floor(random() * options.length)] = { id: `pack:${pack.id}`, kind: 'stickerPack', pack };
  }
  const stickers = assignRewardMaterial(options.flatMap((option) => option.kind === 'sticker' ? [option.sticker] : []), materialTier, random);
  let index = 0;
  return options.map((option) => option.kind === 'sticker' ? { ...option, sticker: stickers[index++] } : option);
}
export function generateChestRewardOptions(equipments: Equipment[], random: () => number = Math.random): ChestRewardOption[] {
  return sampleDistinct(equipments, REWARD_CONFIG.chestOptionCount, random)
    .map(equipment => ({ id: `equipment:${equipment.id}`, kind: 'equipment', equipment }));
}
export function generateContrabandPrize(region: RegionId, random = Math.random): PermanentSticker {
  return sampleDistinct(ALL_STICKERS_CATALOG.filter((item): item is PermanentSticker =>
    item.isDisposable === false && item.region === region && item.rarity === 'rare' && item.creature !== 'princess'), 1, random)[0];
}
