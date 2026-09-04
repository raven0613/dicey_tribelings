import { Equipment, StickerItem } from '../../types/game';
import { INITIAL_PLAYER_STATS } from '../../configs/gameConfig';

export interface ShopBuyResult {
  success: boolean;
  newGold?: number;
  newPlayerHp?: number;
  newEquipments?: Equipment[];
  newShopEquipments?: Equipment[];
  newShopStickers?: StickerItem[];
  purchasedSticker?: StickerItem;
}

export function handleBuyShopItem(
  type: 'sticker' | 'equipment' | 'dice' | 'heal',
  id: string,
  state: {
    gold: number;
    playerHp: number;
    maxHp: number;
    equipments: Equipment[];
    shopEquipments: Equipment[];
    shopStickers: StickerItem[];
  }
): ShopBuyResult {
  const { gold, playerHp, maxHp, equipments, shopEquipments, shopStickers } = state;

  if (type === 'sticker') {
    const sticker = shopStickers.find((s) => s.id === id);
    const cost = sticker?.cost || 20;
    if (gold >= cost && sticker) {
      return {
        success: true,
        newGold: gold - cost,
        newShopStickers: shopStickers.filter((s) => s.id !== id),
        purchasedSticker: sticker,
      };
    }
  } else if (type === 'equipment') {
    const equip = shopEquipments.find((e) => e.id === id);
    const cost = 35;
    if (gold >= cost && equip && equipments.length < INITIAL_PLAYER_STATS.maxEquipmentSlots) {
      return {
        success: true,
        newGold: gold - cost,
        newEquipments: [...equipments, equip],
        newShopEquipments: shopEquipments.filter((e) => e.id !== id),
      };
    }
  } else if (type === 'heal') {
    const cost = 20;
    if (gold >= cost && playerHp < maxHp) {
      return {
        success: true,
        newGold: gold - cost,
        newPlayerHp: Math.min(maxHp, playerHp + 25),
      };
    }
  }

  return { success: false };
}
