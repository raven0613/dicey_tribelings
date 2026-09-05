import assert from 'node:assert/strict';
import test from 'node:test';
import { openStickerPack } from './packService';
import { STICKER_PACKS_CATALOG } from '../../configs/stickerPacksConfig';

test('opens the configured number of distinct stickers', () => {
  const result = openStickerPack('pack_elemental', () => 0);

  assert.equal(result.stickers.length, 3);
  assert.equal(new Set(result.stickers.map((sticker) => sticker.id)).size, 3);
});

test('sticker packs contain both permanent and disposable stickers', () => {
  const result = openStickerPack('pack_mythic', () => 0.5);

  assert.ok(result.stickers.some((sticker) => sticker.isDisposable));
  assert.ok(result.stickers.some((sticker) => !sticker.isDisposable));
});

test('draws every sticker from the selected pack configured pool', () => {
  const pack = STICKER_PACKS_CATALOG.find((item) => item.id === 'pack_tactical');
  const result = openStickerPack('pack_tactical', () => 0.75);

  assert.ok(pack);
  assert.ok(result.stickers.every((sticker) => pack.stickerIds.includes(sticker.id)));
});
