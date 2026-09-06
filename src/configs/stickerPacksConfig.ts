import { CREATURE_BALANCE } from './creatures/creatureBalanceConfig';
import type { StickerPack } from '../types/game';
import { ALL_STICKERS_CATALOG } from './creatures/creatureStickerConfig';
import { CREATURE_CONFIG } from './creatures/creatureConfig';

const standard = ALL_STICKERS_CATALOG.filter((item) => item.creature !== 'princess');
export const STICKER_PACKS_CATALOG: StickerPack[] = [
  { id: 'pack_tribe', name: '【土人同盟貼紙包】', rarity: 'rare',
    description: '開出 3 張土人貼紙，包含永久配置與本場強化。', stickerCount: 3, themeName: '土人同盟',
    stickerIds: standard.filter((item) => item.rewardTier === 'mid' || item.isDisposable).map((item) => item.id) },
  { id: 'pack_royal', name: '【貴族貼紙包】', rarity: 'legendary',
    description: `開出 4 張王庭貼紙，每包有 ${CREATURE_BALANCE.princess.packChance * 100}% 機會取得小公主；每 Run 最多從包中取得 ${CREATURE_BALANCE.princess.packLimit} 張。`, stickerCount: 4, themeName: '王庭遠征',
    stickerIds: ALL_STICKERS_CATALOG.filter((item) => CREATURE_CONFIG[item.creature].tags.includes('noble')
      && (item.rewardTier === 'late' || item.rewardTier === 'boss' || item.isDisposable || item.creature === 'princess')).map((item) => item.id) },
  { id: 'pack_tactical', name: '【土人戰術貼紙包】', rarity: 'rare',
    description: '開出 3 張土人貼紙，組合重骰、搶奪與護盾反擊。', stickerCount: 3, themeName: '土人戰術',
    stickerIds: standard.filter((item) => ['gang', 'boss', 'thief', 'guard', 'priest', 'bulwark', 'teacher', 'prankster'].includes(item.creature)
      && (item.rewardTier === 'mid' || item.isDisposable)).map((item) => item.id) },
];
