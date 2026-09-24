import { VIEWPORT_PRESENTATION } from '../../configs/viewportConfig';
import type { Dice } from '../../types/game';
import { DICE_TRAY_PRESENTATION as layout, DICE_RESULT_PRESENTATION as result } from '../../configs/dicePresentationConfig';

export function getDiceResultMetrics(minimumFontSize: number = VIEWPORT_PRESENTATION.minimumFontSize) {
  const fontSize = Math.max(result.fontSize, minimumFontSize);
  const lineHeight = result.lineHeight * fontSize / result.fontSize;
  return { fontSize, lineHeight, height: result.paddingY * 2 + result.rows * lineHeight };
}

export function getDiceTrayMetrics(size: number, minimumFontSize?: number) {
  const scale = size / layout.size;
  const topPadding = layout.topPadding * scale;
  const pitch = size + layout.phantomGap * scale;
  const normalY = topPadding + pitch + size / 2;
  const resultHeight = result.gap + getDiceResultMetrics(minimumFontSize).height;
  return {
    topPadding, pitch, normalY,
    spacing: size + layout.slotGap * scale,
    sidePadding: layout.sidePadding * scale,
    height: normalY + size / 2 + resultHeight + layout.bottomPadding * scale,
  };
}

/** Lay out the complete round before reveal; normal dice keep independent, stable positions. */
export function getDiceTrayLayout(width: number, dice: Dice[], size: number = layout.size,
  minimumFontSize?: number, bonusCount = 0) {
  const { topPadding, pitch, normalY, spacing, sidePadding, height } = getDiceTrayMetrics(size, minimumFontSize);
  const contentWidth = Math.max(width, sidePadding * 2 + Math.max(
    Math.max(0, dice.length - 1) * spacing + size, Math.max(0, bonusCount - 1) * pitch + size));
  const positions = dice.map((_, index) => ({
    x: Math.max(sidePadding + size / 2, (width - (dice.length - 1) * spacing) / 2) + index * spacing,
    y: normalY,
  }));
  const bonusPositions = Array.from({ length: bonusCount }, (_, index) => ({
    x: Math.max(sidePadding + size / 2, (width - (bonusCount - 1) * pitch) / 2) + index * pitch,
    y: topPadding + size / 2,
  }));
  return { size, width: contentWidth, height, positions, spacing, bonusPositions };
}
