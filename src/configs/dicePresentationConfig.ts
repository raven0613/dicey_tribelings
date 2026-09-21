import type { Dice } from '../types/game';
import type { CreatureId, CreatureTag } from '../types/creatures';
import { CREATURE_TAG_COLORS_DICE } from './creatures/creatureConfig';

export const DICE_SHAPES: Record<Dice['dieType'], { outline: string; facets: string }> = {
  d4: { outline: 'M45 10 Q50 2 55 10 L94 80 Q99 90 87 90 H13 Q1 90 6 80 Z', facets: 'M50 13 L50 29 M12 83 L25 70 M88 83 L75 70' },
  d6: { outline: 'M22 7 H78 Q93 7 93 22 V78 Q93 93 78 93 H22 Q7 93 7 78 V22 Q7 7 22 7 Z', facets: '' },
  d8: { outline: 'M45 5 Q50 1 55 5 L94 44 Q99 50 94 56 L55 95 Q50 99 45 95 L6 56 Q1 50 6 44 Z', facets: 'M50 9 V25 M9 50 H22 M78 50 H91 M50 76 V91' },
  d10: { outline: 'M46 5 Q50 2 54 5 L89 27 Q94 30 94 37 V63 Q94 70 88 74 L54 95 Q50 98 46 95 L12 74 Q6 70 6 63 V37 Q6 30 11 27 Z', facets: 'M50 8 V23 M11 33 L23 40 M89 33 L77 40 M14 70 L26 66 M86 70 L74 66 M50 77 V92' },
  d12: { outline: 'M46 5 Q50 2 54 5 L91 31 Q96 35 94 41 L80 87 Q78 93 71 93 H29 Q22 93 20 87 L6 41 Q4 35 9 31 Z', facets: 'M50 9 V24 M11 37 L24 42 M89 37 L76 42 M26 86 L33 74 M74 86 L67 74' },
};

export const DICE_ROLL_PRESENTATION = {
  duration: 0.82, durationVariation: 0.08, faceInterval: 0.065, settleAt: 0.78,
  startOffsetX: 70, startOffsetY: 100, rerollOffset: 24, arcHeight: 38,
  turns: 2, turnVariation: 1, bounceAt: 0.62, bounceHeight: 9,
} as const;

export const DICE_TRAY_PRESENTATION = {
  size: 87, mobileSize: 58, slotGap: 60, sidePadding: 20,
  topPadding: 28, bottomPadding: 8, phantomGap: 12,
} as const;

export const DICE_RESULT_PRESENTATION = {
  rows: 4, lineHeight: 14, gap: 4, paddingY: 2, paddingX: 4, fontSize: 11,
} as const;

export const PLAYER_BOARD_PRESENTATION = {
  equipmentSlotSize: 60, equipmentSlotGap: 6, scrollbarSpace: 6,
} as const;

export const DICE_IDENTITY_PRESENTATION = {
  portraitSize: 87,
} as const;

// Coordinates below use the shared 100 × 100 SVG canvas, scaled to the current dice footprint.
export const DICE_FACE_PRESENTATION = {
  viewBoxSize: 100, rimStrokeWidth: 2,
  bodyColor: '#ffffff', bevelShade: '#888c95', edgeColor: '#a8b0bc',
  rimRadius: 10, stickerInset: 11, stickerRadius: 6, stickerColor: '#ffffff',
  stickerEdgeColor: '#929bb1', stickerEdgeWidth: 0.6,
} as const;

export const DICE_NUMBER_PRESENTATION = {
  fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif',
  fontWeight: 900, fontSize: 36, maxWidth: 68,
  x: 92, y: 89, strokeColor: '#ffffff', strokeWidth: 3.5,
  tagColors: { ...CREATURE_TAG_COLORS_DICE } satisfies Record<CreatureTag, string>,
  // Direction of the dividing line: -45° runs from bottom-left to top-right.
  splitAngle: -45,
  rainbowAngle: 45,
  rainbowColors: ['#d93651', '#df7624', '#b79808', '#229e61', '#267ed0', '#8254ce'],
} as const;

// Layer order is back to front; every image retains its full transparent canvas.
const characterLayers = (...names: string[]) => names.map((name) =>
  new URL(`../assets/dice/face/${name}.png`, import.meta.url).href);

export const DICE_CHARACTER_LAYERS: Partial<Record<CreatureId, readonly string[]>> = {
  family: characterLayers('family_parent_1', 'family_parent_2', 'family_child'),
  sisters: characterLayers('divas_red_face', 'divas_red_eyes', 'divas_red_hand',
    'divas_blue_face', 'divas_blue_eyes', 'divas_blue_hand'),
  twins: characterLayers('twins_face', 'twins_hand_left', 'twins_hand_right', 'twins_effect'),
  gang: characterLayers('hood_face', 'hood_hand'),
  boss: characterLayers('buster_face', 'buster_crown', 'buster_candy', 'buster_hand'),
  loner: characterLayers('loner_face', 'loner_eye', 'loner_hat'),
  chef: characterLayers('chef_face', 'chef_eyes', 'chef_hand'),
  porter: characterLayers('porter_face', 'porter_box_s', 'porter_box_l', 'porter_hand'),
  follower: characterLayers('sidekick_face', 'sidekick_eyes', 'sidekick_sword', 'sidekick_hand'),
  thief: characterLayers('crook_face', 'crook_hand_left', 'crook_hand_right'),
  coward: characterLayers('coward_face', 'coward_eyes', 'coward_hand_left', 'coward_hand_right', 'coward_sweat'),
  guard: characterLayers('bodyguard_hair_1', 'bodyguard_face'),
  warrior: characterLayers('hero_face', 'hero_eye', 'hero_sword'),
  elder: characterLayers('elder_face', 'elder_pipe', 'elder_smoke'),
};

export const DICE_CHARACTER_PRESENTATION = {
  gang: {
    movingLayer: 1,
    durationMs: 800, start: { x: -24, y: 27 }, control: { x: -4, y: -15 },
    press: { x: 4, y: 8 },
    pressHoldMs: 10, reboundMs: 450,
    // 上拉占曲線移動時間的比例，其餘時間用於下壓。
    riseFraction: 0.65,
    // x1 y1 x2 y2：上拉快速起步、最高點減速，再加速下壓。
    riseEasing: '0.16 0.65 0.4 0.9', pressEasing: '0.45 0.12 0.8 0.45',
    reboundEasing: '0.16 0.8 0.3 1',
  },
} as const;

export const PHANTOM_DICE_PRESENTATION = {
  side: 72, borderWidth: 2, cornerRadius: 12, rotateX: 20, rotateY: -20, floatDistance: 4,
} as const;
