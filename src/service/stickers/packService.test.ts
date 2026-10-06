import assert from 'node:assert/strict';
import test from 'node:test';
import { openStickerPack } from './packService';
import { STICKER_PACKS_CATALOG } from '../../configs/stickerPacksConfig';
import { CREATURE_BALANCE } from '../../configs/creatures/creatureBalanceConfig';

test('theme packs grant three permanent stickers and allow promised duplicates', () => {
  for (const pack of STICKER_PACKS_CATALOG) {
    const result = openStickerPack(pack.id, () => 0.5);
    assert.equal(result.stickers.length, pack.stickerCount);
    assert.ok(result.stickers.every(item => !item.isDisposable && pack.creatures.includes(item.creature)));
    assert.ok(result.stickers.every(item => !('baseValue' in item) && !('region' in item)));
    if (pack.id === 'pack_family') assert.ok(result.stickers.filter(item => item.creature === 'family').length >= 2);
    if (pack.id === 'pack_twins') assert.ok(result.stickers.filter(item => item.creature === 'twins').length >= 2);
  }
});

test('royal princess replacement obeys the run allocation limit', () => {
  for (const count of [0, 1, CREATURE_BALANCE.princess.packLimit]) {
    const items = openStickerPack('pack_royal', () => 0, count).stickers;
    assert.equal(items.filter(item => item.creature === 'princess').length, count < CREATURE_BALANCE.princess.packLimit ? 1 : 0);
  }
  for (const pack of STICKER_PACKS_CATALOG.filter(pack => pack.id !== 'pack_royal'))
    assert.ok(openStickerPack(pack.id, () => 0).stickers.every(item => item.creature !== 'princess'));
});

test('a special material tier coats one sticker per pack including duplicate-role packs', () => {
  for (const pack of STICKER_PACKS_CATALOG) {
    const result = openStickerPack(pack.id, () => 0.995);
    assert.equal(result.stickers.filter(sticker => sticker.material).length, 1);
  }
});
