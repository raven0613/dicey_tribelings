import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';
import { BACKPACK_PRESENTATION } from '../../configs/inventoryConfig';
import { useGameViewport } from '../layout/GameViewportContext';
import { getGameRect } from '../../service/layout/gameViewport';
import { StickerBadge } from './StickerBadge';
import type { StickerCreatureId } from '../../types/game';

export interface StickerPoint {
  x: number;
  y: number;
}
export interface StickerFlight {
  creature: StickerCreatureId;
  start: StickerPoint;
  target: StickerPoint;
  arrive: () => void;
  source: HTMLElement;
}

export function stickerCenter(element: Element): StickerPoint {
  const rect = getGameRect(element);
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function StickerTransfer({ flight }: { flight: StickerFlight }) {
  const { overlay } = useGameViewport();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const arrive = useRef(flight.arrive);
  const completed = useRef(false);
  arrive.current = flight.arrive;
  useLayoutEffect(() => {
    const finish = () => {
      if (completed.current) return;
      completed.current = true;
      arrive.current();
    };
    const element = ref.current;
    if (!element || reduced) {
      finish();
      return;
    }
    const opacity = flight.source.style.opacity;
    flight.source.style.opacity = '0';
    const dx = flight.target.x - flight.start.x,
      dy = flight.target.y - flight.start.y;
    const animation = element.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.65)`,
          opacity: 1,
        },
      ],
      {
        duration: BACKPACK_PRESENTATION.transferMs,
        easing: 'cubic-bezier(.4,0,.2,1)',
        fill: 'forwards',
      },
    );
    animation.onfinish = finish;
    return () => {
      animation.cancel();
      flight.source.style.opacity = opacity;
    };
  }, [flight.start, flight.target, flight.source, reduced]);
  return (
    overlay &&
    createPortal(
      <div
        ref={ref}
        className="sticker-transfer"
        aria-hidden="true"
        style={{
          left: flight.start.x,
          top: flight.start.y,
          width: BACKPACK_PRESENTATION.transferSize,
          height: BACKPACK_PRESENTATION.transferSize,
        }}
      >
        <StickerBadge
          creature={flight.creature}
          size={BACKPACK_PRESENTATION.transferSize}
          iconOnly
          showTooltip={false}
        />
      </div>,
      overlay,
    )
  );
}
