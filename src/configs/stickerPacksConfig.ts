import { StickerItem, StickerPack } from '../types/game';
import { ALL_STICKERS_CATALOG } from './gameConfig';

export const STICKER_PACKS_CATALOG: StickerPack[] = [
  {
    id: 'pack_elemental',
    name: '【元素風暴貼紙包】',
    rarity: 'rare',
    description: '開出 3 張高額元素貼紙，包含突破 7~13 點數的永久貼紙與強效一次性貼紙！',
    stickerCount: 3,
    themeName: '元素狂潮',
  },
  {
    id: 'pack_mythic',
    name: '【創世神話貼紙包】',
    rarity: 'legendary',
    description: '開出 4 張頂級貼紙，極高機率開出 14~18 點數的傳奇永久與毀滅級戰術貼紙！',
    stickerCount: 4,
    themeName: '傳奇神話',
  },
  {
    id: 'pack_tactical',
    name: '【戰術軍備貼紙包】',
    rarity: 'rare',
    description: '開出 3 張戰術貼紙，包含整場戰鬥生效的一次性消耗品與高額強化貼紙！',
    stickerCount: 3,
    themeName: '戰術軍備',
  },
];

/**
 * Open a sticker pack and return rolled stickers (mix of permanent & disposable)
 */
export function openStickerPack(packId: string): StickerItem[] {
  const pack = STICKER_PACKS_CATALOG.find((p) => p.id === packId) || STICKER_PACKS_CATALOG[0];
  const count = pack.stickerCount;

  // Filter pools
  const permPool = ALL_STICKERS_CATALOG.filter((s) => !s.isDisposable);
  const dispPool = ALL_STICKERS_CATALOG.filter((s) => s.isDisposable);

  const results: StickerItem[] = [];

  // Guarantee at least 1 permanent sticker and at least 1 disposable sticker
  const shuffledPerm = [...permPool].sort(() => Math.random() - 0.5);
  const shuffledDisp = [...dispPool].sort(() => Math.random() - 0.5);

  if (shuffledPerm.length > 0) results.push(shuffledPerm[0]);
  if (shuffledDisp.length > 0) results.push(shuffledDisp[0]);

  // Fill remaining slots randomly from all stickers
  const remainingPool = [...ALL_STICKERS_CATALOG].sort(() => Math.random() - 0.5);
  for (const s of remainingPool) {
    if (results.length >= count) break;
    results.push(s);
  }

  return results;
}
