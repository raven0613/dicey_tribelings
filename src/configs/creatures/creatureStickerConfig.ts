import { DIRECTIONAL_STICKER } from '../directionalStickerConfig';
import type { DisposableSticker, PermanentSticker, StickerItem } from '../../types/game';
import type { RegionId } from '../../types/enemy';
import type { PermanentCreatureId } from '../../types/creatures';
import { CREATURE_CONFIG, CREATURE_IDS } from './creatureConfig';
import { REGION_CONFIG, REGION_IDS } from '../regions/regionConfig';
import { SHOP_CONFIG } from '../shopConfig';

export const CREATURE_BASE_VALUES: Record<PermanentCreatureId, number> = {
  detective: 3, fruit: 2, family: 3, sisters: 3, twins: 3, gang: 2, boss: 3, loner: 3, chef: 4,
  porter: 3, follower: 2, cheerleader: 2, thief: 2, coward: 3, guard: 3,
  warrior: 3, elder: 2, artisan: 3, priest: 2, knight: 3, teacher: 3,
  royalGuard: 3, prankster: 3, authority: 2, farmer: 3, imposter: 2,
  glutton: 3, bulwark: 2, bully: 3, herald: 2, princess: 0, food: 6,
};
export const DISPOSABLE_CREATURES: readonly PermanentCreatureId[] = [
  'family', 'sisters', 'twins', 'gang', 'boss', 'chef', 'porter', 'follower',
  'fruit', 'warrior', 'thief', 'coward', 'guard', 'artisan', 'farmer', 'food', 'prankster',
];
export function createPermanentSticker(creature: PermanentCreatureId, region: RegionId): PermanentSticker {
  const meta = CREATURE_CONFIG[creature];
  const baseValue = creature === 'princess' ? 0 : CREATURE_BASE_VALUES[creature] + REGION_CONFIG[region].stickerBonus;
  return { id: `st_${creature}_r${region}`, name: `${meta.name} ${baseValue}｜${meta.ability}`,
    isDisposable: false, creature, baseValue, rarity: meta.rarity, region, description: meta.description };
}
export const DIRECTIONAL_STICKER_ITEM: DisposableSticker = {
  id: DIRECTIONAL_STICKER.id, name: DIRECTIONAL_STICKER.name, description: DIRECTIONAL_STICKER.description,
  creature: 'directional', isDisposable: true, rarity: 'common', cost: SHOP_CONFIG.directionalCost,
};
export const DISPOSABLE_STICKERS: DisposableSticker[] = [...DISPOSABLE_CREATURES.map((creature): DisposableSticker => {
  const meta = CREATURE_CONFIG[creature];
  return { id: `st_${creature}_disposable`, name: `本場 ${meta.name}`, isDisposable: true,
    creature, rarity: meta.rarity, cost: SHOP_CONFIG.disposableCost,
    description: `本場變為${meta.name}，沿用目標面的基礎攻擊力。${meta.description}` };
}), DIRECTIONAL_STICKER_ITEM];
export const ALL_STICKERS_CATALOG: StickerItem[] = [
  ...REGION_IDS.flatMap((region) => CREATURE_IDS.filter((id) => id !== 'princess' || region === 1)
    .map((creature) => createPermanentSticker(creature, region))),
  ...DISPOSABLE_STICKERS,
];
