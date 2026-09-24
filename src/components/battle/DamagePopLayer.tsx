import { useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { DAMAGE_POP_PRESENTATION as config } from '../../configs/numberFeedbackConfig';
import { DICE_NUMBER_PRESENTATION } from '../../configs/dicePresentationConfig';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { getDamagePopAppearance } from '../../service/battle/presentation/numberFeedback';
import { findDamagePopSlot, type PopSlot } from '../../service/battle/presentation/damagePops';
import { getGameRect } from '../../service/layout/gameViewport';
import { useGameViewport } from '../layout/GameViewportContext';
import type { DamagePop } from '../../types/game';

/** A stable overlay keeps each hit alive and separate from the enemy's flinch/attack transforms. */
export function DamagePopLayer({ anchorRef, pops }: { anchorRef: RefObject<HTMLDivElement | null>; pops: DamagePop[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const slots = useRef(new Map<number, PopSlot>());
  const animations = useRef(new Map<number, Animation>());
  const boundsKey = useRef('');
  const { overlay, scale, width, height, minimumFontSize } = useGameViewport();
  useLayoutEffect(() => {
    const ids = new Set(pops.map((pop) => pop.id));
    for (const id of slots.current.keys()) if (!ids.has(id)) slots.current.delete(id);
    for (const [id, animation] of animations.current) if (!ids.has(id)) {
      animation.cancel(); animations.current.delete(id);
    }
    const root = rootRef.current;
    if (!root) { slots.current.clear(); return; }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bounds = `${scale}:${width}:${height}:${minimumFontSize}`;
    const resized = boundsKey.current !== bounds;
    if (resized) { slots.current.clear(); boundsKey.current = bounds; }
    const anchor = getGameRect(anchorRef.current!);
    const elements = Array.from(root.querySelectorAll<HTMLSpanElement>('.damage-pop-item'));
    for (const element of elements) {
      const id = Number(element.dataset.popId);
      const pop = pops.find((item) => item.id === id)!;
      const text = element.firstElementChild as HTMLSpanElement;
      const appearance = getDamagePopAppearance(pop.value);
      const peak = reduced ? 1 : appearance.peak;
      const launch = reduced ? 0 : appearance.launch;
      const rise = reduced ? 0 : launch + config.rise;
      const naturalWidth = text.offsetWidth + config.strokeWidth * 2;
      const naturalHeight = text.offsetHeight + config.strokeWidth * 2;
      // Fit the entire animated footprint inside unusually narrow windows without truncating digits.
      const fit = Math.min(1, (width - config.edgeMargin * 2) / (naturalWidth * peak),
        (height - config.edgeMargin * 2 - rise) / (naturalHeight * peak));
      const textWidth = naturalWidth * fit, textHeight = naturalHeight * fit;
      const size = { width: textWidth * peak, height: textHeight * peak + rise };
      let slot = slots.current.get(id);
      if (!slot) {
        slot = findDamagePopSlot(size, { x: anchor.left + anchor.width / 2, y: anchor.top },
          { width, height }, [...slots.current.values()]);
        slots.current.set(id, slot);
      }
      Object.assign(element.style, { left: `${slot.x}px`, top: `${slot.y}px`, width: `${slot.width}px`, height: `${slot.height}px`, visibility: 'visible' });
      Object.assign(text.style, { left: `${(size.width - naturalWidth) / 2}px`,
        top: `${rise + (textHeight * peak - naturalHeight) / 2}px` });
      if (!animations.current.has(id) || resized) {
        const transform = (distance: number, factor: number) => `translateY(${-distance}px) scale(${factor * fit})`;
        const frames: Keyframe[] = [
          { offset: 0, opacity: 1, transform: reduced ? transform(0, 1)
            : `scale(${config.entryScale * fit}, ${config.entryScale * config.entryStretch * fit})`, easing: 'cubic-bezier(.12,.8,.25,1)' },
          { offset: config.peakFraction, opacity: 1, transform: transform(launch, peak), easing: 'ease-out' },
          { offset: config.reboundFraction, opacity: 1, transform: transform(launch * config.reboundHeight, reduced ? 1 : config.reboundScale), easing: 'ease-out' },
          { offset: config.settleFraction, opacity: 1, transform: transform(launch, 1) },
          { offset: config.fadeFraction, opacity: 1, transform: transform(launch + (rise - launch) * config.fadeFraction, 1) },
          { offset: 1, opacity: 0, transform: transform(rise, 1) },
        ];
        const existing = animations.current.get(id);
        if (existing) (existing.effect as KeyframeEffect).setKeyframes(frames);
        else {
          const animation = text.animate(frames, { duration: config.lifetimeMs, easing: 'linear', fill: 'both' });
          animation.currentTime = Math.max(0, performance.now() - pop.startedAt);
          animations.current.set(id, animation);
        }
      }
    }
  }, [pops, overlay, anchorRef, scale, width, height, minimumFontSize]);
  useLayoutEffect(() => () => {
    for (const animation of animations.current.values()) animation.cancel();
    animations.current.clear();
  }, []);

  return overlay && pops.length > 0 ? createPortal(<div ref={rootRef} className="damage-pops-layer" aria-hidden="true">
    {pops.map((pop) => <span key={pop.id} data-pop-id={pop.id} className="damage-pop-item">
      <span className="damage-pop-number" style={{
        fontSize: getDamagePopAppearance(pop.value).fontSize * Math.max(1, minimumFontSize / config.font.min),
        lineHeight: config.lineHeight, fontFamily: DICE_NUMBER_PRESENTATION.fontFamily,
        color: pop.creature ? CREATURE_CONFIG[pop.creature].color : config.defaultColor,
        WebkitTextStroke: `${config.strokeWidth}px ${config.strokeColor}`,
      } as CSSProperties}>{pop.value}</span>
    </span>)}
  </div>, overlay) : null;
}
