import { REWARD_CONFIG } from './rewardConfig';
import type { StickerPack } from '../types/game';
import type { PermanentCreatureId } from '../types/creatures';
import { CREATURE_CONFIG, CREATURE_IDS } from './creatures/creatureConfig';
const crafts = CREATURE_IDS.filter(id => CREATURE_CONFIG[id].tags.includes('craftsman'));
function pack(id: string, name: string, slots: PermanentCreatureId[][]): StickerPack {
  return { id, name, themeName: name, rarity: 'rare', stickerCount: REWARD_CONFIG.packStickerCount, permanentCount: REWARD_CONFIG.packStickerCount,
    description: '三張永久貼紙，較容易出現相關土人貼紙。', slots, creatures: [...new Set(slots.flat())] };
}
export const STICKER_PACKS_CATALOG: StickerPack[] = [
  pack('pack_family', '家族包', [['family'], ['family'], ['family', 'fruit', 'knight', 'bulwark', 'imposter']]),
  pack('pack_twins', '雙子包', [['twins'], ['twins'], ['twins', 'fruit', 'coward', 'imposter']]),
  pack('pack_gang', '混混包', [['gang'], ['gang'], ['gang', 'boss', 'prankster', 'herald']]),
  pack('pack_valor', '勇武包', [['warrior'], ['follower'], ['warrior', 'follower', 'cheerleader', 'loner', 'guard']]),
  pack('pack_crafts', '職人包', [crafts, crafts, crafts]),
  pack('pack_kitchen', '廚房包', [['chef'], ['food'], ['chef', 'food', 'farmer', 'glutton', 'fruit']]),
  pack('pack_bad', '壞壞包', [['boss'], ['thief'], ['family', 'sisters', 'coward', 'bully', 'detective']]),
  pack('pack_royal', '貴族包', [['authority'], ['knight'], ['family', 'sisters', 'cheerleader', 'priest', 'bully', 'elder', 'royalGuard']]),
];
