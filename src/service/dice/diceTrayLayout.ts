import { VIEWPORT_PRESENTATION } from '../../configs/viewportConfig';
import type { BonusAttackDice, Dice } from '../../types/game';
import { getBonusCapacities } from '../battle/creatures/bonusCapacity';
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

/** Reserve by build, so rolling and revealing bonuses never move the normal row. */
export function getDiceTrayLayout(width: number, dice: Dice[], size: number = layout.size, minimumFontSize?: number) {
  const capacities = getBonusCapacities(dice);
  const sources = dice.map((die, index) => ({ key: `creature:${die.id}`, capacity: capacities[index] }));
  const slotCount = sources.reduce((total, source) => total + source.capacity, 0);
  const { topPadding, pitch, normalY, spacing, sidePadding, height } = getDiceTrayMetrics(size, minimumFontSize);
  const contentWidth = Math.max(width, sidePadding * 2 + Math.max(
    Math.max(0, dice.length - 1) * spacing + size, Math.max(0, slotCount - 1) * pitch + size));
  const positions = dice.map((_, index) => ({
    x: Math.max(sidePadding + size / 2, (width - (dice.length - 1) * spacing) / 2) + index * spacing,
    y: normalY,
  }));
  const bonusPositions: Record<string, { x: number; y: number }[]> = {};
  let slot = 0;
  for (const source of sources) {
    bonusPositions[source.key] = Array.from({ length: source.capacity }, () => {
      const index = slot++;
      return { x: (contentWidth - (slotCount - 1) * pitch) / 2 + index * pitch,
        y: topPadding + size / 2 };
    });
  }
  return { size, width: contentWidth, height, positions, spacing, bonusPositions };
}

export function placeBonusDice(bonuses: BonusAttackDice[], positions: ReturnType<typeof getDiceTrayLayout>['bonusPositions']) {
  const counts: Record<string, number> = {};
  return bonuses.map(({ source }) => {
    const key = source.kind === 'creature' ? `creature:${source.diceId}` : `equipment:${source.equipmentId}`;
    const index = counts[key] ?? 0;
    counts[key] = index + 1;
    return positions[key][index];
  });
}
