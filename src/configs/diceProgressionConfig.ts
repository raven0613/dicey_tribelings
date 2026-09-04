import { Dice } from '../types/game';

export const PROGRESSION_DICE_REWARDS: Record<number, Dice> = {
  // Unlocked after defeating Node 1 (Goblin Rocker)
  1: {
    id: 'dice_frost_d6',
    name: '霜晶寒冰骰 (Frost D6)',
    dieType: 'd6',
    colorTheme: 'emerald',
    faces: [
      { id: 'f_i1', baseValue: 7, element: 'ice' },
      { id: 'f_i2', baseValue: 8, element: 'ice' },
      { id: 'f_i3', baseValue: 8, element: 'ice' },
      { id: 'f_i4', baseValue: 9, element: 'normal' },
      { id: 'f_i5', baseValue: 10, element: 'ice' },
      { id: 'f_i6', baseValue: 12, element: 'ice' },
    ],
  },
  // Unlocked after defeating Node 5 (【菁英】雷翼幼龍)
  5: {
    id: 'dice_volcano_d8',
    name: '火山巨岩骰 (Volcano D8)',
    dieType: 'd8',
    colorTheme: 'obsidian',
    faces: [
      { id: 'f_v1', baseValue: 6, element: 'fire' },
      { id: 'f_v2', baseValue: 7, element: 'fire' },
      { id: 'f_v3', baseValue: 8, element: 'fire' },
      { id: 'f_v4', baseValue: 9, element: 'fire' },
      { id: 'f_v5', baseValue: 10, element: 'fire' },
      { id: 'f_v6', baseValue: 11, element: 'normal' },
      { id: 'f_v7', baseValue: 12, element: 'fire' },
      { id: 'f_v8', baseValue: 14, element: 'fire' },
    ],
  },
};
