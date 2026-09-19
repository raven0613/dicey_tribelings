import type { Dice } from '../types/game';
import type { CreatureTag } from '../types/creatures';
import { CREATURE_TAG_COLORS, CREATURE_TAG_COLORS_DICE } from './creatures/creatureConfig';

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
  size: 87, mobileSize: 58, mobileBreakpoint: 600, slotGap: 29, sidePadding: 24,
  topPadding: 32, bottomPadding: 12, detailsHeight: 64, phantomGap: 20,
} as const;

// Coordinates below use the shared 100 × 100 SVG canvas, scaled to the current dice footprint.
export const DICE_FACE_PRESENTATION = {
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

export const DICE_CHARACTER_PRESENTATION = {
  gang: {
    face: new URL('../assets/dice/face/hood_face.png', import.meta.url).href,
    hand: new URL('../assets/dice/face/hood_hand.png', import.meta.url).href,
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
  side: 72, cornerRadius: 12, rotateX: 20, rotateY: -20, floatDistance: 4,
} as const;
