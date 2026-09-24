import type { ArrowId, CreatureId } from '../types/creatures';

export const ARROW_IDS: readonly ArrowId[] = ['arrowUp', 'arrowRight', 'arrowDown', 'arrowLeft'];
export const DIRECTIONAL_STICKER = {
  id: 'st_directional_disposable',
  name: '自由轉向貼紙',
  description: '戰前可選上下左右方向。擲到時翻至指定相鄰面，整場有效；目的面須為土人或食物。',
  defaultDirection: 'arrowUp' as ArrowId,
} as const;
export const ARROW_CONFIG = {
  arrowUp: { name: '向上箭頭', glyph: '↑', vector: [0, -1], rotation: 0 },
  arrowDown: { name: '向下箭頭', glyph: '↓', vector: [0, 1], rotation: 180 },
  arrowLeft: { name: '向左箭頭', glyph: '←', vector: [-1, 0], rotation: -90 },
  arrowRight: { name: '向右箭頭', glyph: '→', vector: [1, 0], rotation: 90 },
} as const;
export const ARROW_DESCRIPTION = '擲到時，翻至箭頭指向的相鄰面；目的面須為土人或食物。';
export const ARROW_PRESENTATION = { holdMs: 180, flipMs: 360, color: '#34465c' } as const;
export const isArrowFace = (id: CreatureId): id is ArrowId => ARROW_IDS.includes(id as ArrowId);
