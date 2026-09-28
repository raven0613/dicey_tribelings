import type { Equipment, PermanentSticker, StickerItem } from '../../types/game';
import type { RegionId } from '../../types/enemy';
import { ALL_STICKERS_CATALOG, DIRECTIONAL_STICKER_ITEM } from '../../configs/creatures/creatureStickerConfig';
import { ALL_EQUIPMENT_CATALOG } from '../../configs/equipment/equipmentConfig';
import { SHOP_CONFIG } from '../../configs/shopConfig';
import { sampleDistinct, stickerKey } from '../rewards/refreshService';
export function generateShopStock(equipments: Equipment[], region: RegionId, random = Math.random,
  current: { shopStickers: StickerItem[]; shopEquipments: Equipment[] } = { shopStickers: [], shopEquipments: [] }) {
  const excluded = new Set(current.shopStickers.map(stickerKey));
  const hasDirectional = !excluded.has(stickerKey(DIRECTIONAL_STICKER_ITEM)) && random() < SHOP_CONFIG.directionalChance;
  const temporary = sampleDistinct(ALL_STICKERS_CATALOG.filter(item => item.isDisposable && item.creature !== 'directional' && !excluded.has(stickerKey(item))),
    SHOP_CONFIG.stickerStockCount - Number(hasDirectional), random);
  if (hasDirectional) temporary.push(DIRECTIONAL_STICKER_ITEM);
  const permanent = sampleDistinct(ALL_STICKERS_CATALOG.filter((item): item is PermanentSticker => item.isDisposable === false
    && item.region === region && item.creature !== 'princess' && !excluded.has(stickerKey(item))), SHOP_CONFIG.permanentStockCount, random)
    .map(item => ({ ...item, cost: SHOP_CONFIG.permanentCost }));
  const shopEquipments = sampleDistinct(ALL_EQUIPMENT_CATALOG.filter(item => !equipments.some(owned => owned.id === item.id)
    && !current.shopEquipments.some(shown => shown.id === item.id)), SHOP_CONFIG.equipmentStockCount, random);
  return { shopStickers: [...permanent, ...temporary], shopEquipments };
}
