import { sampleDistinct } from './refreshService';
import { rollMaterialTier, assignRewardMaterial } from './materialRewards';
import type { BattleRewardOption, ChestRewardOption, Equipment, PermanentSticker } from '../../types/game';
import type { PermanentCreatureId } from '../../types/creatures';
import type { EnemyRank } from '../../types/enemy';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { createPermanentSticker } from '../../configs/creatures/creatureStickerConfig';
import { RELATED_POOLS, NORMAL_REWARD_CREATURES } from '../../configs/creatures/rewardPoolsConfig';
import { STICKER_PACKS_CATALOG } from '../../configs/stickerPacksConfig';
import { REWARD_CONFIG } from '../../configs/rewardConfig';
import { openStickerPack } from '../stickers/packService';
import { takeWeighted } from './rewardSampling';
export function getBattleRewardCount(rank: EnemyRank): number { return rank === 'normal' ? REWARD_CONFIG.normalFightPickCount : REWARD_CONFIG.advancedPickCount; }
export function getSkipRewardGold(rank: EnemyRank): number { return REWARD_CONFIG.skipGold[rank]; }
export function getBattleRewardStickers(option: BattleRewardOption): PermanentSticker[] {
  return option.kind === 'bundle' ? [option.sticker, ...option.hidden] : option.stickers;
}
function normalPartner(front: PermanentCreatureId, random: () => number): PermanentSticker {
  const pool = random() < REWARD_CONFIG.relatedChance ? RELATED_POOLS[front]! : NORMAL_REWARD_CREATURES;
  return takeWeighted(pool.map(createPermanentSticker), random)!;
}
export function generateBattleRewardOptions(rank: EnemyRank,
  random: () => number = Math.random, excluded: readonly string[] = [], optionCount: number = rank === 'normal' ? REWARD_CONFIG.normalFightOptionCount : REWARD_CONFIG.advancedOptionCount, princessCount = 0): BattleRewardOption[] {
  if (rank !== 'normal') {
    const available = STICKER_PACKS_CATALOG.filter(pack => !excluded.includes(`pack:${pack.id}`));
    return sampleDistinct(available, optionCount, random).map(pack => ({
      id: `pack:${pack.id}`, kind: 'pack', pack,
      stickers: openStickerPack(pack.id, random, princessCount).stickers,
    }));
  }
  const available = NORMAL_REWARD_CREATURES.filter(id => !excluded.includes(`permanent:${id}`)).map(createPermanentSticker);
  return Array.from({ length: optionCount }, () => {
    const front = takeWeighted(available, random)!;
    const hidden = Array.from({ length: REWARD_CONFIG.normalHiddenStickerCount }, () => normalPartner(front.creature, random));
    const [sticker, ...rest] = assignRewardMaterial([front, ...hidden], rollMaterialTier(random), random);
    return { id: `bundle:${front.creature}`, kind: 'bundle', sticker, hidden: rest };
  });
}
export function generateChestRewardOptions(equipments: Equipment[], random: () => number = Math.random): ChestRewardOption[] {
  return sampleDistinct(equipments, REWARD_CONFIG.chestOptionCount, random).map(equipment => ({ id: `equipment:${equipment.id}`, kind: 'equipment', equipment }));
}
export function generateContrabandPrize(random = Math.random): PermanentSticker {
  return sampleDistinct(NORMAL_REWARD_CREATURES.filter(id => CREATURE_CONFIG[id].rarity === 'rare').map(createPermanentSticker), 1, random)[0];
}
