import { StickerPack } from '../types/game';

export const STICKER_PACKS_CATALOG: StickerPack[] = [
  {
    id: 'pack_elemental',
    name: '【元素風暴貼紙包】',
    rarity: 'rare',
    description: '開出 3 張高額元素貼紙，包含突破 7~13 點數的永久貼紙與強效一次性貼紙！',
    stickerCount: 3,
    themeName: '元素狂潮',
    stickerIds: [
      'st_fire_8', 'st_fire_12', 'st_wind_9', 'st_wind_13', 'st_thunder_10',
      'st_thunder_14', 'st_ice_9', 'st_ice_13', 'st_disp_meteor_15',
      'st_disp_supercharge_18', 'st_disp_frostnova_14', 'st_disp_typhoon_16',
    ],
  },
  {
    id: 'pack_mythic',
    name: '【創世神話貼紙包】',
    rarity: 'legendary',
    description: '開出 4 張頂級貼紙，極高機率開出 14~18 點數的傳奇永久與毀滅級戰術貼紙！',
    stickerCount: 4,
    themeName: '傳奇神話',
    stickerIds: [
      'st_fire_12', 'st_wind_13', 'st_thunder_14', 'st_ice_13', 'st_crit_crush',
      'st_disp_meteor_15', 'st_disp_supercharge_18', 'st_disp_frostnova_14', 'st_disp_typhoon_16',
    ],
  },
  {
    id: 'pack_tactical',
    name: '【戰術軍備貼紙包】',
    rarity: 'rare',
    description: '開出 3 張戰術貼紙，包含整場戰鬥生效的一次性消耗品與高額強化貼紙！',
    stickerCount: 3,
    themeName: '戰術軍備',
    stickerIds: [
      'st_thunder_10', 'st_ice_9', 'st_wild_prism', 'st_normal_11',
      'st_disp_meteor_15', 'st_disp_supercharge_18', 'st_disp_frostnova_14', 'st_disp_typhoon_16',
    ],
  },
];
