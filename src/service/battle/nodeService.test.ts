import { REFRESH_CONFIG } from '../../configs/refreshConfig';
import { getRefreshCost } from '../rewards/refreshService';
import { CAMP_CONFIG } from '../../configs/campConfig';
import { drawCampBuff, resolveCampChoice } from '../camp/campService';
import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_EQUIPMENT_CATALOG } from '../../configs/gameConfig';
import { SHOP_CONFIG } from '../../configs/shopConfig';
import { generateShopStock } from '../shop/shopStock';
import { stickerKey } from '../rewards/refreshService';
test('shops supply permanent and temporary faces, and refresh excludes only the current stock', () => {
  const owned = [ALL_EQUIPMENT_CATALOG[0]], random = () => 0;
  const a = generateShopStock(owned, random);
  assert.equal(a.shopStickers.filter(item => !item.isDisposable).length, SHOP_CONFIG.permanentStockCount);
  assert.equal(a.shopStickers.filter(item => item.isDisposable).length, SHOP_CONFIG.stickerStockCount);
  assert.ok(a.shopEquipments.every(item => item.id !== owned[0].id));
  const b = generateShopStock(owned, random, a);
  assert.ok(b.shopStickers.every(item => !a.shopStickers.some(old => stickerKey(old) === stickerKey(item))));
  assert.ok(b.shopEquipments.every(item => !a.shopEquipments.some(old => old.id === item.id)));
  const c = generateShopStock(owned, random, b);
  assert.ok(c.shopStickers.some(item => a.shopStickers.some(old => stickerKey(old) === stickerKey(item))));
});

test('camp choices cap recovery, charge full healing exactly once and refresh only excludes the current buff', () => {
  const state = { playerHp: 1, maxHp: 60, gold: CAMP_CONFIG.fullHealCost, campOffer: 'ward' as const };
  assert.deepEqual(resolveCampChoice('heal', state), { playerHp: state.playerHp + CAMP_CONFIG.healAmount });
  assert.deepEqual(resolveCampChoice('heal', { ...state, playerHp: state.maxHp - 1 }), { playerHp: state.maxHp });
  assert.deepEqual(resolveCampChoice('fullHeal', state), { playerHp: state.maxHp, gold: 0 });
  assert.equal(resolveCampChoice('fullHeal', { ...state, gold: CAMP_CONFIG.fullHealCost - 1 }), null);
  assert.deepEqual(resolveCampChoice('buff', state), { campBuff: state.campOffer });
  for (const choice of ['heal', 'fullHeal'] as const)
    assert.equal(resolveCampChoice(choice, { ...state, playerHp: state.maxHp }), null);
  const a = drawCampBuff(null, () => 0), b = drawCampBuff(a, () => 0);
  assert.notEqual(a, b);
  assert.equal(drawCampBuff(b, () => 0), a);
  assert.equal(getRefreshCost('camp', 2), REFRESH_CONFIG.camp * 3);
});
