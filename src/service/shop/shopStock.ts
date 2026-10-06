import { STICKER_PACKS_CATALOG } from '../../configs/stickerPacksConfig';
import { rollMaterialTier, assignRewardMaterial } from '../rewards/materialRewards';
import type { Equipment, PermanentSticker, StickerItem, StickerPack } from '../../types/game';
import { ALL_STICKERS_CATALOG, DIRECTIONAL_STICKER_ITEM } from '../../configs/creatures/creatureStickerConfig';
import { ALL_EQUIPMENT_CATALOG } from '../../configs/equipment/equipmentConfig';
import { SHOP_CONFIG } from '../../configs/shopConfig';
import { takeWeighted } from '../rewards/rewardSampling';
import { sampleDistinct, stickerKey } from '../rewards/refreshService';
export function generateShopStock(equipments: Equipment[], random = Math.random,
  current: { shopStickers: StickerItem[]; shopEquipments: Equipment[]; shopPacks?: StickerPack[] } = { shopStickers: [], shopEquipments: [] }) {
  const excluded = new Set(current.shopStickers.map(stickerKey));
  const hasDirectional = !excluded.has(stickerKey(DIRECTIONAL_STICKER_ITEM)) && random() < SHOP_CONFIG.directionalChance;
  const temporary = sampleDistinct(ALL_STICKERS_CATALOG.filter(item => item.isDisposable && item.creature !== 'directional' && !excluded.has(stickerKey(item))),
    SHOP_CONFIG.stickerStockCount - Number(hasDirectional), random);
  if (hasDirectional) temporary.push(DIRECTIONAL_STICKER_ITEM);
  const candidates = ALL_STICKERS_CATALOG.filter((item): item is PermanentSticker => item.isDisposable === false
    && item.creature !== 'princess' && !excluded.has(stickerKey(item)));
  const permanent = Array.from({ length: SHOP_CONFIG.permanentStockCount }, () => takeWeighted(candidates, random)!)
    .map(item => ({ ...assignRewardMaterial([item], rollMaterialTier(random), random)[0], cost: SHOP_CONFIG.permanentCost }));
  const shopEquipments = sampleDistinct(ALL_EQUIPMENT_CATALOG.filter(item => !equipments.some(owned => owned.id === item.id)
    && !current.shopEquipments.some(shown => shown.id === item.id)), SHOP_CONFIG.equipmentStockCount, random);
  const shopPacks = sampleDistinct(STICKER_PACKS_CATALOG.filter(pack => !current.shopPacks?.some(item => item.id === pack.id)), SHOP_CONFIG.packStockCount, random);
  return { shopPacks, shopStickers: [...permanent, ...temporary], shopEquipments };
}
