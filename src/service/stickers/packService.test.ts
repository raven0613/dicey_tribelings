import assert from 'node:assert/strict';
import test from 'node:test';
import { openStickerPack } from './packService';
import { STICKER_PACKS_CATALOG, FINAL_STICKER_PACK } from '../../configs/stickerPacksConfig';
import { REGION_IDS } from '../../configs/regions/regionConfig';

test('packs fulfill their permanent allocation and theme at the current regional quality', () => {
  for (const region of REGION_IDS) for (const pack of [...STICKER_PACKS_CATALOG, FINAL_STICKER_PACK]) {
    const result = openStickerPack(pack.id, region, () => 0.5);
    assert.equal(result.stickers.length, pack.stickerCount);
    assert.equal(new Set(result.stickers.map((item) => item.id)).size, pack.stickerCount);
    assert.equal(result.stickers.filter((item) => !item.isDisposable).length, pack.permanentCount);
    for (const item of result.stickers) {
      assert.ok(pack.creatures.includes(item.creature));
      if (item.isDisposable === false) assert.equal(item.region, region);
      else assert.equal('baseValue' in item, false);
    }
  }
});
test('princess allocation is separate from regional quality and stops after two royal drops', () => {
  for (const count of [0, 1, 2]) {
    const items = openStickerPack('pack_royal', 6, () => 0, count).stickers;
    assert.equal(items.filter((item) => item.creature === 'princess').length, count < 2 ? 1 : 0);
  }
  assert.ok(openStickerPack('pack_tribe', 6, () => 0).stickers.every((item) => item.creature !== 'princess'));
});
