import type { BackgroundScene } from '../../types/background';

export const SWAMP_BACKGROUND = {
  assetDirectory: 'swamp',
  color: '#C5DE58',
  sourceWidth: 3810,
  fullBackground: { file: 'full_bg', brightness: 0.45, blur: 6 },
  // 距離場地底部的設計單位；增加時，back、草、石頭與木頭一起向上移動。
  baselineBottom: 400,
  // 頂部素材的共用基準線；增加時，vine 與 beard 一起向下移動。
  baselineTop: 0,
  // width / height 是原始圖片像素；x / localX 是 1920 寬構圖中的設計單位。
  back: [
    {
      layer: 1, images: [
        { file: 'back_1_1', width: 389, height: 1375, x: 0 },
        { file: 'back_1_2', width: 380, height: 341, x: 1580 },
      ]
    },
    {
      layer: 2, images: [
        { file: 'back_2_1', width: 817, height: 1375, x: 35 },
        { file: 'back_2_2', width: 726, height: 1375, x: 1554 },
      ]
    },
    {
      layer: 3, images: [
        { file: 'back_3_1', width: 331, height: 1375, x: 10 },
        { file: 'back_3_2', width: 416, height: 1375, x: 1712 },
      ]
    },
    {
      layer: 4, images: [
        { file: 'back_4_1', width: 727, height: 1375, x: 150 },
        { file: 'back_4_2', width: 458, height: 350, x: 500 },
        { file: 'back_4_3', width: 950, height: 1375, x: 1220 },
      ]
    },
    {
      layer: 5, images: [
        { file: 'back_5_1', width: 3810, height: 521, x: 0 },
      ]
    },
    {
      layer: 6, images: [
        { file: 'back_6_1', width: 995, height: 1375, x: 10 },
        { file: 'back_6_2', width: 1285, height: 1375, x: 1260 },
      ]
    },
    {
      layer: 7, images: [
        { file: 'back_7_1', width: 645, height: 1121, x: 120 },
        { file: 'back_7_2', width: 401, height: 1081, x: 450 },
        { file: 'back_7_3', width: 362, height: 838, x: 1120 },
        { file: 'back_7_4', width: 465, height: 1283, x: 1350 },
        { file: 'back_7_5', width: 508, height: 1065, x: 1530 },
      ]
    },
  ],
  grass: [
    {
      id: 1, x: 70, leaves: [
        { file: 'front_grass_2_1', width: 279, height: 466, localX: 0 },
        { file: 'front_grass_2_2', width: 132, height: 585, localX: 80 },
        { file: 'front_grass_2_3', width: 97, height: 605, localX: 140 },
        { file: 'front_grass_2_4', width: 74, height: 454, localX: 183 },
        { file: 'front_grass_2_5', width: 379, height: 465, localX: 160 },
      ]
    },
    {
      id: 2, x: 0, leaves: [
        { file: 'front_grass_1_1', width: 141, height: 644, localX: 0 },
        { file: 'front_grass_1_3', width: 229, height: 822, localX: 50 },
        { file: 'front_grass_1_2', width: 141, height: 666, localX: 55 },
      ]
    },
    {
      id: 3, x: 370, leaves: [
        { file: 'front_grass_3_1', width: 161, height: 286, localX: 0 },
      ]
    },
    {
      id: 4, x: 460, leaves: [
        { file: 'front_grass_4_1', width: 269, height: 315, localX: 0 },
      ]
    },
    {
      id: 5, x: 1330, leaves: [
        { file: 'front_grass_5_1', width: 153, height: 257, localX: 0 },
      ]
    },
    {
      id: 6, x: 1350, leaves: [
        { file: 'front_grass_6_1', width: 290, height: 314, localX: 0 },
      ]
    },
    {
      id: 7, x: 1620, leaves: [
        { file: 'front_grass_7_1', width: 317, height: 556, localX: 0 },
        { file: 'front_grass_7_2', width: 157, height: 710, localX: 120 },
        { file: 'front_grass_7_3', width: 160, height: 635, localX: 120 },
        { file: 'front_grass_7_4', width: 230, height: 664, localX: 150 },
        { file: 'front_grass_7_5', width: 111, height: 554, localX: 210 },
      ]
    },
  ],
  props: [
    { file: 'front_stone_1', width: 310, height: 203, x: 0 },
    { file: 'front_wood_1', width: 142, height: 1050, x: 1848 },
  ],
  ground: { file: 'front_ground', width: 3810, height: 896 },
  hanging: [
    { file: 'front_vine_1', width: 297, height: 812, x: 0 },
    { file: 'front_vine_2', width: 216, height: 464, x: 0 },
    { file: 'front_vine_3', width: 475, height: 778, x: 1680 },
    { file: 'front_beard_1', width: 38, height: 401, x: 1660 },
    { file: 'front_beard_2', width: 120, height: 673, x: 1760 },
  ],
} as const satisfies BackgroundScene;
