import type { BonusAttackDice, Dice } from '../../types/game';
import { getAdjacentFaces, getEffectiveFace } from './diceFaces';
import { DICE_TRAY_PRESENTATION as layout, DICE_RESULT_PRESENTATION as result } from '../../configs/dicePresentationConfig';

export function getDiceTrayMetrics(size: number) {
  const scale = size / layout.size;
  const topPadding = layout.topPadding * scale;
  const pitch = size + layout.phantomGap * scale;
  const normalY = topPadding + pitch + size / 2;
  const resultHeight = result.gap + result.paddingY * 2 + result.rows * result.lineHeight;
  return {
    topPadding, pitch, normalY,
    spacing: size + layout.slotGap * scale,
    sidePadding: layout.sidePadding * scale,
    height: normalY + size / 2 + resultHeight + layout.bottomPadding * scale,
  };
}

/** Reserve by build, so rolling and revealing bonuses never move the normal row. */
export function getDiceTrayLayout(width: number, dice: Dice[], size: number = layout.size) {
  const sources = dice.map((die) => {
    const faces = die.faces.map(getEffectiveFace);
    const gangCapacity = Math.max(0, ...faces.map((face, index) => (face.creature === 'gang' || face.creature === 'imposter')
      ? getAdjacentFaces(die, index).filter((neighbor) => neighbor.creature === 'gang').length : 0));
    const echo = faces.some((face) => face.material === 'echo') ? 2 : 1;
    const priests = faces.filter((face) => face.creature === 'priest' || face.creature === 'imposter');
    return { key: `creature:${die.id}`, capacity: Math.max(1, gangCapacity) * echo
      + priests.reduce((sum, face) => sum + (face.material === 'echo' ? 2 : 1), 0)
      + Number(faces.some((face) => face.material === 'shock')) };
  });
  const slotCount = sources.reduce((total, source) => total + source.capacity, 0);
  const { topPadding, pitch, normalY, spacing, sidePadding, height } = getDiceTrayMetrics(size);
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
