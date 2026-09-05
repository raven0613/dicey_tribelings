import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateHealPurchase, getEquipmentOffer, getStickerOffer } from './shopService';
import { Equipment, StickerItem } from '../../types/game';

const sticker: StickerItem = {
  id: 'sticker-1',
  name: '戰術貼紙',
  isDisposable: true,
  baseValue: 15,
  element: 'fire',
  description: '本場火15',
  rarity: 'rare',
  cost: 22,
};

const equipment: Equipment = {
  id: 'equipment-1',
  name: '測試裝備',
  type: 'global',
  rarity: 'rare',
  description: '測試',
  iconName: 'Sparkles',
  ruleId: 'TEST',
};

test('returns a sticker offer only when the player can afford it', () => {
  assert.deepEqual(getStickerOffer([sticker], sticker.id, 22), { item: sticker, cost: 22 });
  assert.equal(getStickerOffer([sticker], sticker.id, 21), null);
});

test('uses the configured equipment price', () => {
  assert.deepEqual(getEquipmentOffer([equipment], equipment.id, 35), { item: equipment, cost: 35 });
  assert.equal(getEquipmentOffer([equipment], equipment.id, 34), null);
});

test('healing clamps health and charges only for a valid purchase', () => {
  assert.deepEqual(calculateHealPurchase(20, 80, 100), { gold: 0, playerHp: 100 });
  assert.equal(calculateHealPurchase(19, 80, 100), null);
  assert.equal(calculateHealPurchase(20, 100, 100), null);
});
