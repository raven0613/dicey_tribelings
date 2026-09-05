import { Equipment, StickerItem } from '../../types/game';
import { SHOP_CONFIG } from '../../configs/shopConfig';

interface ShopOffer<T> {
  item: T;
  cost: number;
}

export function getStickerOffer(
  stock: StickerItem[],
  stickerId: string,
  gold: number
): ShopOffer<StickerItem> | null {
  const item = stock.find((sticker) => sticker.id === stickerId);
  if (!item) return null;
  const cost = item.cost ?? SHOP_CONFIG.defaultStickerCost;
  return gold >= cost ? { item, cost } : null;
}

export function getEquipmentOffer(
  stock: Equipment[],
  equipmentId: string,
  gold: number
): ShopOffer<Equipment> | null {
  const item = stock.find((equipment) => equipment.id === equipmentId);
  return item && gold >= SHOP_CONFIG.equipmentCost
    ? { item, cost: SHOP_CONFIG.equipmentCost }
    : null;
}

export function calculateHealPurchase(
  gold: number,
  playerHp: number,
  maxHp: number
): { gold: number; playerHp: number } | null {
  if (gold < SHOP_CONFIG.healCost || playerHp >= maxHp) return null;
  return {
    gold: gold - SHOP_CONFIG.healCost,
    playerHp: Math.min(maxHp, playerHp + SHOP_CONFIG.healAmount),
  };
}
