import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/** Keep attack motion outside the scrolling clip while retaining tray-local coordinates. */
export function DiceAttackPortal({ active, trayRef, children }: {
  active: boolean; trayRef: RefObject<HTMLDivElement | null>; children: ReactNode;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  // A stable portal target preserves the die and its animation state when moving between layers.
  const [layer] = useState(() => document.createElement('div'));
  useLayoutEffect(() => {
    layer.className = active ? 'dice-flight-layer' : 'dice-tray-layer';
    (active ? document.body : anchor.current!).append(layer);
    if (!active) return () => layer.remove();
    const position = () => {
      const bounds = trayRef.current!.getBoundingClientRect();
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
      layer.remove();
    };
  }, [active, trayRef, layer]);
  return <><span ref={anchor} className="dice-tray-layer" />{createPortal(children, layer)}</>;
}
