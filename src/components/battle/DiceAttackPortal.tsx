import { useGameViewport } from '../layout/GameViewportContext';
import { getGameRect } from '../../service/layout/gameViewport';
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/** Keep attack motion outside the scrolling clip while retaining tray-local coordinates. */
export function DiceAttackPortal({ active, trayRef, children }: {
  active: boolean; trayRef: RefObject<HTMLDivElement | null>; children: ReactNode;
}) {
  const { overlay, scale, width, height } = useGameViewport();
  const anchor = useRef<HTMLSpanElement>(null);
  // A stable portal target preserves the die and its animation state when moving between layers.
  const [layer] = useState(() => document.createElement('div'));
  useLayoutEffect(() => {
    if (active && !overlay) return;
    layer.className = active ? 'dice-flight-layer' : 'dice-tray-layer';
    (active ? overlay! : anchor.current!).append(layer);
    return () => layer.remove();
  }, [active, layer, overlay]);

  useLayoutEffect(() => {
    if (!active || !overlay) return;
    const position = () => {
      const bounds = getGameRect(trayRef.current!);
      Object.assign(layer.style, {
        left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px`,
      });
    };
    position();
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
    const observer = new ResizeObserver(position);
    observer.observe(trayRef.current!);
    return () => {
      window.removeEventListener('scroll', position, true);
      window.removeEventListener('resize', position);
      observer.disconnect();
    };
  }, [active, trayRef, layer, overlay, scale, width, height]);
  return <><span ref={anchor} className="dice-tray-layer" />{createPortal(children, layer)}</>;
}
