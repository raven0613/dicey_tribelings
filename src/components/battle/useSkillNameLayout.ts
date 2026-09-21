import { useLayoutEffect, useRef, type RefObject } from 'react';
import { BATTLE_PRESENTATION as config } from '../../configs/battleConfig';
import { getGameRect } from '../../service/layout/gameViewport';
import { useGameViewport } from '../layout/GameViewportContext';

interface NameSlot { offset: number; height: number }

/**
 * Call from the anchor's owner so both anchor and descendant portal refs are attached before measurement.
 * Reserve the entire animated footprint; surviving names retain their slots.
 */
export function useSkillNameLayout(anchorRef: RefObject<HTMLDivElement | null>, names: readonly { id: string }[]) {
  const rootRef = useRef<HTMLDivElement>(null);
  const slots = useRef(new Map<string, NameSlot>());
  const { scale, width, height, overlay } = useGameViewport();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) { slots.current.clear(); return; }
    const anchor = anchorRef.current!;
    const elements = Array.from(root.querySelectorAll<HTMLElement>('.skill-name'));
    const ids = new Set(names.map(({ id }) => id));
    for (const id of slots.current.keys()) if (!ids.has(id)) slots.current.delete(id);
    const travelSpace = config.nameRisePx + config.nameEntryPx + config.nameGapPx;

    let topExtent = 0;
    let sizes: { element: HTMLElement; id: string; height: number; width: number }[] = [];
    const position = () => {
      const bounds = getGameRect(anchor);
      const anchorCenter = bounds.left + bounds.width / 2;
      const baseline = Math.max(topExtent + config.nameVerticalMargin,
        Math.min(height - config.nameVerticalMargin - config.nameEntryPx, bounds.top - config.nameAnchorGapPx));
      root.style.left = `${anchorCenter}px`;
      root.style.top = `${baseline}px`;
      for (const { element, width: nameWidth } of sizes) {
        const halfWidth = nameWidth / 2;
        // Oversized names keep their left edge visible and extend to the right.
        const center = Math.max(halfWidth, Math.min(width - halfWidth, anchorCenter));
        element.style.left = `${center - anchorCenter}px`;
      }
    };
    const measure = () => {
      // Read natural dimensions, excluding animated transforms, before writing offsets.
      sizes = elements.map((element) => ({ element, id: element.dataset.eventId!,
        height: element.offsetHeight, width: element.offsetWidth }));
      const resized = sizes.some(({ id, height: nextHeight }) => {
        const slot = slots.current.get(id);
        return slot && slot.height !== nextHeight;
      });
      if (resized) {
        const heights = new Map(sizes.map((item) => [item.id, item.height]));
        let offset = 0;
        for (const [id, slot] of [...slots.current].sort((a, b) => a[1].offset - b[1].offset)) {
          slot.height = heights.get(id)!;
          slot.offset = offset;
          offset += slot.height + travelSpace;
        }
      }
      for (const { id, height: nameHeight } of sizes) {
        if (slots.current.has(id)) continue;
        let offset = 0;
        for (const slot of [...slots.current.values()].sort((a, b) => a.offset - b.offset)) {
          if (offset + nameHeight + travelSpace <= slot.offset) break;
          offset = slot.offset + slot.height + travelSpace;
        }
        slots.current.set(id, { offset, height: nameHeight });
      }
      topExtent = Math.max(...[...slots.current.values()].map((slot) => slot.offset + slot.height)) + config.nameRisePx;
      position();
      for (const { id, element } of sizes) element.style.setProperty('--name-offset', `${slots.current.get(id)!.offset}px`);
      root.style.visibility = 'visible';
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(anchor);
    elements.forEach((element) => observer.observe(element));
    window.addEventListener('scroll', position, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', position, true);
    };
  }, [anchorRef, names, overlay, scale, width, height]);

  return rootRef;
}
