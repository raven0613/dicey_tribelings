import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_EQUIPMENT_CATALOG } from '../../configs/gameConfig';
import { generateShopStock } from './nodeService';

test('ordinary shops stock only disposable stickers and unowned equipment', () => {
  const owned = [ALL_EQUIPMENT_CATALOG[0]];
  const stock = generateShopStock(owned, () => 0);

  assert.ok(stock.shopStickers.every((sticker) => sticker.isDisposable));
  assert.ok(stock.shopEquipments.every((equipment) => equipment.id !== owned[0].id));
  assert.equal(new Set(stock.shopStickers.map((sticker) => sticker.id)).size, stock.shopStickers.length);
});
