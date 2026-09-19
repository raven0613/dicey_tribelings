import type { BonusAttackDice, Dice } from '../../types/game';
import { getAdjacentFaces, getEffectiveFace } from './diceFaces';
import { DICE_TRAY_PRESENTATION as layout } from '../../configs/dicePresentationConfig';

/** Reserve by build, so rolling and revealing bonuses never move the normal row. */
export function getDiceTrayLayout(width: number, height: number, dice: Dice[], detailsHeight: number = layout.detailsHeight, size: number = layout.size) {
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
  const scale = size / layout.size;
  const topPadding = layout.topPadding * scale;
  const bottomPadding = layout.bottomPadding * scale;
  const sidePadding = layout.sidePadding * scale;
  const pitch = size + layout.phantomGap * scale;
  const spacing = size + layout.slotGap * scale;
  const availableRows = Math.max(1, Math.floor((height - topPadding - bottomPadding - size - detailsHeight) / pitch));
  const columns = Math.max(1, Math.ceil(slotCount / availableRows));
  const rows = Math.ceil(slotCount / columns);
  const occupiedHeight = rows * pitch + size + detailsHeight + topPadding + bottomPadding;
  const contentHeight = Math.max(height, occupiedHeight);
  const contentWidth = Math.max(width, sidePadding * 2 + Math.max(
    Math.max(0, dice.length - 1) * spacing + size, (columns - 1) * pitch + size));
  const top = topPadding + (contentHeight - occupiedHeight) / 2;
  const normalY = top + rows * pitch + size / 2;
  const positions = dice.map((_, index) => ({
    x: Math.max(sidePadding + size / 2, (width - (dice.length - 1) * spacing) / 2) + index * spacing,
    y: normalY,
  }));
  const bonusPositions: Record<string, { x: number; y: number }[]> = {};
  let slot = 0;
  for (const source of sources) {
    bonusPositions[source.key] = Array.from({ length: source.capacity }, () => {
      const index = slot++;
      return { x: (contentWidth - (columns - 1) * pitch) / 2 + index % columns * pitch,
        y: top + Math.floor(index / columns) * pitch + size / 2 };
    });
  }
  return { size, width: contentWidth, height: contentHeight, positions, spacing, bonusPositions };
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
