import { useRef, useState, type PointerEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { BACKPACK_PRESENTATION } from '../../../configs/inventoryConfig';
import { useGameViewport } from '../../layout/GameViewportContext';
import { StickerBadge } from '../StickerBadge';
import type { StickerCreatureId } from '../../../types/game';
import type { StickerSource, useStickerEditor } from './useStickerEditor';

type Drag = {
  source: StickerSource;
  creature: StickerCreatureId;
  x: number;
  y: number;
  pointerId: number;
  moved: boolean;
};

export function useStickerDrag(p: ReturnType<typeof useStickerEditor>) {
  const { overlay, scale } = useGameViewport();
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [ghost, setGhost] = useState<{ creature: StickerCreatureId; x: number; y: number } | null>(
    null,
  );
  const cancel = () => {
    drag.current = null;
    setGhost(null);
  };
  const bindings = (source: StickerSource) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (!p.editable || event.button !== 0) return;
      suppressClick.current = false;
      const item = p.sourceSticker(source);
      if (!item) return;
      if (source.kind !== 'face') p.selectSource(source);
      drag.current = {
        source,
        creature: item.creature,
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
        moved: false,
      };
    },
  });
  const rootBindings = {
    onPointerDownCapture: () => {
      suppressClick.current = false;
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      if (event.buttons !== 1) {
        cancel();
        return;
      }
      if (!current.moved) {
        if (
          Math.hypot(event.clientX - current.x, event.clientY - current.y) <
          BACKPACK_PRESENTATION.dragThreshold
        )
          return;
        current.moved = true;
        suppressClick.current = true;
        p.selectSource(current.source);
        // Capture on the editor so switching dice does not detach the capture owner.
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      const stage = document.getElementById('game-stage')!.getBoundingClientRect();
      setGhost({
        creature: current.creature,
        x: (event.clientX - stage.left) / scale,
        y: (event.clientY - stage.top) / scale,
      });
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      if (!hit || !event.currentTarget.contains(hit)) return;
      const tab = hit.closest<HTMLElement>('[data-dice-tab]');
      if (tab && tab.dataset.diceTab !== p.die.id) p.chooseDie(tab.dataset.diceTab!);
      const face = hit.closest<HTMLElement>('[data-sticker-face]');
      if (face) p.setFaceIndex(Number(face.dataset.stickerFace));
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      if (current.moved && hit && event.currentTarget.contains(hit)) {
        const face = hit.closest<HTMLElement>('[data-sticker-face]');
        if (face)
          p.applyAt(current.source, face.dataset.stickerDice!, Number(face.dataset.stickerFace));
        else if (hit.closest('[data-sticker-backpack]')) p.storeSource(current.source);
        else p.cancel();
      } else if (current.moved) p.cancel();
      cancel();
    },
    onPointerCancel: () => {
      cancel();
      p.cancel();
    },
    onLostPointerCapture: (event: PointerEvent<HTMLElement>) => {
      if (event.target === event.currentTarget) cancel();
    },
    onClickCapture: (event: MouseEvent<HTMLElement>) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
  return {
    bindings,
    rootBindings,
    ghost:
      ghost &&
      overlay &&
      createPortal(
        <div
          className="sticker-drag-ghost"
          aria-hidden="true"
          style={{ left: ghost.x, top: ghost.y }}
        >
          <StickerBadge creature={ghost.creature} showTooltip={false} />
        </div>,
        overlay,
      ),
  };
}
