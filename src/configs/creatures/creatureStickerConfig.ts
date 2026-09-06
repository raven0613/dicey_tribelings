import type { EquipmentRarity, RewardTier, StickerItem } from '../../types/game';
import type { CreatureId } from '../../types/creatures';
import { CREATURE_CONFIG, CREATURE_IDS } from './creatureConfig';

export const CREATURE_BASE_VALUES: Record<CreatureId, number> = {
  family: 3, sisters: 3, twins: 3, gang: 2, boss: 3, loner: 3, chef: 4,
  porter: 3, follower: 2, cheerleader: 2, thief: 2, coward: 3, guard: 3,
  warrior: 3, elder: 2, artisan: 3, priest: 2, knight: 3, teacher: 3,
  royalGuard: 3, prankster: 3, authority: 2, farmer: 3, imposter: 2,
  glutton: 3, bulwark: 2, bully: 3, herald: 2, princess: 0, food: 6,
};

export const CREATURE_STICKER_TIERS: Record<RewardTier, { bonus: number; rarity: EquipmentRarity; cost: number }> = {
  early: { bonus: 0, rarity: 'common', cost: 16 },
  mid: { bonus: 4, rarity: 'common', cost: 24 },
  late: { bonus: 8, rarity: 'rare', cost: 38 },
  boss: { bonus: 11, rarity: 'legendary', cost: 50 },
};

export const DISPOSABLE_CREATURE_STICKERS = { bonus: 12, cost: 30, rarity: 'rare' as const };

export const ALL_STICKERS_CATALOG: StickerItem[] = CREATURE_IDS.flatMap((creature) => {
  const meta = CREATURE_CONFIG[creature];
  const permanent = (Object.entries(CREATURE_STICKER_TIERS) as [RewardTier, typeof CREATURE_STICKER_TIERS[RewardTier]][])
    .map(([rewardTier, tier]): StickerItem => {
      const baseValue = creature === 'princess' ? 0 : CREATURE_BASE_VALUES[creature] + tier.bonus;
      return {
        id: `st_${creature}_${rewardTier}`, name: `${meta.name} ${baseValue}｜${meta.ability}`,
        isDisposable: false, creature, baseValue, rarity: tier.rarity, cost: tier.cost, rewardTier,
        description: `${meta.description}`
      };
    });
  const disposable = DISPOSABLE_CREATURE_STICKERS;
  const baseValue = CREATURE_BASE_VALUES[creature] + disposable.bonus;
  if (creature === 'princess') return permanent.slice(0, 1).map((item) => ({ ...item, rarity: 'legendary' as const }));
  return [...permanent, {
    id: `st_${creature}_disposable`, name: `本場 ${meta.name} ${baseValue}`,
    isDisposable: true, creature, baseValue, rarity: disposable.rarity, cost: disposable.cost,
    description: `整場覆蓋為${meta.name}${baseValue}，戰後恢復原面。${meta.description}`
  }];
});
