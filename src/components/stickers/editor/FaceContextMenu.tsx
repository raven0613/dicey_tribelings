import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGameViewport } from '../../layout/GameViewportContext';
import { BACKPACK_PRESENTATION } from '../../../configs/inventoryConfig';

export interface FaceMenuTarget {
  x: number;
  y: number;
  faceIndex: number;
  element: HTMLElement;
}

export function FaceContextMenu({
  target,
  disabledReason,
  onTake,
  onClose,
}: {
  target: FaceMenuTarget;
  disabledReason?: string;
  onTake: () => void;
  onClose: () => void;
}) {
  const { overlay, width, height } = useGameViewport();
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const menu = ref.current!;
    menu.style.left = `${Math.max(0, Math.min(target.x, width - menu.offsetWidth))}px`;
    menu.style.top = `${Math.max(0, Math.min(target.y, height - menu.offsetHeight))}px`;
    menu.querySelector('button')?.focus();
  }, [target, width, height]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [onClose]);
  return (
    overlay &&
    createPortal(
      <div
        ref={ref}
        className="sticker-face-menu"
        role="menu"
        style={{ width: BACKPACK_PRESENTATION.menuWidth }}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key === 'Escape' || event.key === 'Tab') {
            event.preventDefault();
            onClose();
            target.element.focus();
          }
        }}
      >
        <button type="button" role="menuitem" disabled={Boolean(disabledReason)} onClick={onTake}>
          取下
        </button>
        {disabledReason && <p>{disabledReason}</p>}
      </div>,
      overlay,
    )
  );
}
