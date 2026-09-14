import type { BonusAttackDice, Dice } from '../../types/game';
import { getAdjacentFaces, getEffectiveFace } from './diceFaces';
import { DICE_TRAY_PRESENTATION as layout } from '../../configs/dicePresentationConfig';

/** Reserve by build, so rolling and revealing bonuses never move the normal row. */
export function getDiceTrayLayout(width: number, height: number, dice: Dice[], detailsHeight: number = layout.detailsHeight) {
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
  const availableWidth = Math.max(0, width - layout.sidePadding * 2);
  const extentRatio = layout.phantomExtent * layout.normalBodyRatio / layout.phantomBodySize;
  let size = 0;
  let columns = 1;
  // Evaluate each row arrangement and keep the largest common body size that fits.
  for (let count = 1; count <= Math.max(1, slotCount); count++) {
    const rows = Math.ceil(slotCount / count);
    const candidate = Math.min(layout.maxSize,
      availableWidth / Math.max(1, dice.length) - layout.slotGap,
      (availableWidth / count - layout.phantomGap) / (extentRatio * 2),
      (height - layout.topPadding - detailsHeight - rows * layout.phantomGap) / (1 + rows * extentRatio * 2));
    if (candidate > size) { size = candidate; columns = count; }
  }
  const phantomScale = size * layout.normalBodyRatio / layout.phantomBodySize;
  const pitch = layout.phantomExtent * 2 * phantomScale + layout.phantomGap;
  const rows = Math.ceil(slotCount / columns);
  const occupiedHeight = rows * pitch + size + detailsHeight;
  const top = Math.max(layout.topPadding, (height - occupiedHeight) / 2);
  const normalY = top + rows * pitch + size / 2;
  const spacing = Math.min(layout.maxSpacing, availableWidth / Math.max(1, dice.length));
  const positions = dice.map((_, index) => ({
    x: (width - (dice.length - 1) * spacing) / 2 + index * spacing, y: normalY,
  }));
  const bonusPositions: Record<string, { x: number; y: number }[]> = {};
  let slot = 0;
  for (const source of sources) {
    bonusPositions[source.key] = Array.from({ length: source.capacity }, () => {
      const index = slot++;
      return { x: (width - (columns - 1) * pitch) / 2 + index % columns * pitch,
        y: top + Math.floor(index / columns) * pitch + layout.phantomExtent * phantomScale };
    });
  }
  return { size, positions, spacing, phantomScale, bonusPositions };
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
