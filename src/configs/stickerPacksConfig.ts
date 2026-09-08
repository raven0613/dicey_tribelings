import type { StickerPack } from '../types/game';
import { CREATURE_CONFIG, CREATURE_IDS } from './creatures/creatureConfig';
import { CREATURE_BALANCE } from './creatures/creatureBalanceConfig';

export const STICKER_PACKS_CATALOG: StickerPack[] = [
  { id: 'pack_tribe', name: '家族貼紙包', rarity: 'rare', stickerCount: 3, permanentCount: 2,
    description: '兩張永久、一張本場貼紙，補齊家族與群體組合。', themeName: '家族',
    creatures: ['family', 'sisters', 'twins', 'gang', 'boss', 'thief', 'cheerleader', 'imposter'] },
  { id: 'pack_food', name: '食物貼紙包', rarity: 'rare', stickerCount: 3, permanentCount: 2,
    description: '兩張永久、一張本場貼紙，搭配食物、儲糧與職人。', themeName: '食物',
    creatures: ['food', 'farmer', 'chef', 'glutton', 'porter', 'artisan'] },
  { id: 'pack_tactical', name: '戰術貼紙包', rarity: 'rare', stickerCount: 3, permanentCount: 2,
    description: '兩張永久、一張本場貼紙，搭配重骰、戰士與護盾。', themeName: '戰術',
    creatures: ['warrior', 'follower', 'guard', 'coward', 'priest', 'bulwark', 'teacher', 'prankster', 'herald'] },
  { id: 'pack_royal', name: '貴族貼紙包', rarity: 'legendary', stickerCount: 4, permanentCount: 4,
    description: `四張永久貴族貼紙，${CREATURE_BALANCE.princess.packChance * 100}% 機會取得小公主，包中每趟最多兩張。`, themeName: '貴族',
    creatures: CREATURE_IDS.filter((id) => id !== 'princess' && CREATURE_CONFIG[id].tags.includes('noble')) },
];
export const FINAL_STICKER_PACK: StickerPack = {
  id: 'pack_final', name: '深牢補給包', rarity: 'rare', stickerCount: 2, permanentCount: 2,
  description: '兩張終盤永久貼紙，完成決戰前調整。', themeName: '深牢補給',
  creatures: CREATURE_IDS.filter((id) => id !== 'princess'),
};
