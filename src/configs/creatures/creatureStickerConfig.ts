import { DIRECTIONAL_STICKER } from '../directionalStickerConfig';
import type { DisposableSticker, PermanentSticker, StickerItem } from '../../types/game';
import type { PermanentCreatureId } from '../../types/creatures';
import { CREATURE_CONFIG, CREATURE_IDS } from './creatureConfig';
import { SHOP_CONFIG } from '../shopConfig';

export const DISPOSABLE_CREATURES: readonly PermanentCreatureId[] = [
  'family', 'sisters', 'twins', 'gang', 'boss', 'chef', 'porter', 'follower',
  'fruit', 'warrior', 'thief', 'coward', 'guard', 'artisan', 'farmer', 'food', 'prankster',
];
export function createPermanentSticker(creature: PermanentCreatureId): PermanentSticker {
  const meta = CREATURE_CONFIG[creature];
  return { id: `st_${creature}`, name: `${meta.name}｜${meta.ability}`,
    isDisposable: false, creature, rarity: meta.rarity, description: meta.description };
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
  ...CREATURE_IDS.map(createPermanentSticker), ...DISPOSABLE_STICKERS,
];
