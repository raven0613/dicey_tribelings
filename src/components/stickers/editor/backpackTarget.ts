import { getGameRect } from '../../../service/layout/gameViewport';
import { sortStickers } from '../../../service/inventory/stickerInstances';
import type { ConsumableSticker, OwnedPermanentSticker, StickerSort } from '../../../types/game';

export function backpackTarget(
  section: HTMLElement,
  items: (OwnedPermanentSticker | ConsumableSticker)[],
  incoming: OwnedPermanentSticker | ConsumableSticker,
  sort: StickerSort,
) {
  const grid = section.querySelector<HTMLElement>('.backpack-grid')!;
  const existing = grid.querySelector<HTMLElement>(`[data-backpack-item="${incoming.instanceId}"]`);
  if (existing) {
    existing.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    const rect = getGameRect(existing);
    return {
      point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      cleanup: () => {},
    };
  }
  const style = getComputedStyle(grid);
  const columns = style.gridTemplateColumns.split(' ').map(Number.parseFloat);
  const gap = Number.parseFloat(style.gap);
  const rowHeight = Number.parseFloat(style.gridAutoRows);
  const index = sortStickers([...items, incoming], sort).findIndex(
    (item) => item.instanceId === incoming.instanceId,
  );
  const row = Math.floor(index / columns.length),
    column = index % columns.length;
  grid.style.paddingBottom = `${rowHeight + gap}px`;
  const top = row * (rowHeight + gap);
  section.scrollTop = Math.max(
    0,
    Math.min(top, Math.max(section.scrollTop, top + rowHeight - section.clientHeight)),
  );
  const rect = getGameRect(grid);
  return {
    point: {
      x: rect.left + column * (columns[0] + gap) + columns[0] / 2,
      y: rect.top + top + rowHeight / 2,
    },
    cleanup: () => {
      grid.style.paddingBottom = '';
    },
  };
}
