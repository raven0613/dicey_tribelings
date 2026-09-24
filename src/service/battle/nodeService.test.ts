import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_EQUIPMENT_CATALOG } from '../../configs/gameConfig';
import { SHOP_CONFIG } from '../../configs/shopConfig';
import { generateShopStock } from './nodeService';

test('ordinary shops stock only disposable stickers and unowned equipment', () => {
  const owned = [ALL_EQUIPMENT_CATALOG[0]];
  const stock = generateShopStock(owned, () => 0);
  assert.equal(stock.shopStickers.length, SHOP_CONFIG.stickerStockCount);
  assert.equal(stock.shopStickers.filter((item) => item.creature === 'directional').length, 1);
  const atBoundary = generateShopStock(owned, () => SHOP_CONFIG.directionalChance);
  assert.equal(atBoundary.shopStickers.length, SHOP_CONFIG.stickerStockCount);
  assert.ok(atBoundary.shopStickers.every((item) => item.creature !== 'directional'));
  const belowBoundary = generateShopStock(owned, () => SHOP_CONFIG.directionalChance - Number.EPSILON);
  assert.equal(belowBoundary.shopStickers.filter((item) => item.creature === 'directional').length, 1);

  assert.ok(stock.shopStickers.every((sticker) => sticker.isDisposable));
  assert.ok(stock.shopEquipments.every((equipment) => equipment.id !== owned[0].id));
  assert.equal(new Set(stock.shopStickers.map((sticker) => sticker.id)).size, stock.shopStickers.length);
});
