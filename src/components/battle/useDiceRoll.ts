import { ARROW_CONFIG, ARROW_PRESENTATION } from '../../configs/directionalStickerConfig';
import type { ArrowId } from '../../types/creatures';
import { useLayoutEffect, useRef, useState } from 'react';
import { DICE_TRAY_PRESENTATION } from '../../configs/dicePresentationConfig';
import { createDiceRollAnimation, stepDiceRollAnimation } from '../../service/dice/diceRollAnimation';

/** Only face changes enter React; motion stays local to the die's transform. */
export function useDiceRoll(key: string | null, targetFace: number, faceCount: number,
  size: number, reroll: boolean, onFinish: () => void,
  originFace = targetFace, direction?: ArrowId, flipOnly = false, reducedMotion = false) {
  const ref = useRef<HTMLButtonElement>(null);
  const latest = useRef({ size, onFinish });
  useLayoutEffect(() => { latest.current = { size, onFinish }; });
  const [display, setDisplay] = useState({ key, faceIndex: targetFace, finished: false });

  useLayoutEffect(() => {
    if (key === null) return;
    const element = ref.current!;
    let animation = createDiceRollAnimation(0, 0, originFace, faceCount, reroll);
    let previousTime = performance.now();
    let frame: number;
    let flipStarted: number | null = flipOnly ? previousTime : null;
    const redirect = direction !== undefined && originFace !== targetFace;
    const paint = () => {
      const ratio = latest.current.size / DICE_TRAY_PRESENTATION.size;
      element.style.transform = `translate3d(${animation.x * ratio}px, ${(animation.y - animation.height) * ratio}px, 0)`;
      element.style.setProperty('--roll-rotation', `${animation.rotation}deg`);
      element.style.setProperty('--roll-scale', String(animation.scale));
    };
    if (flipOnly) { animation = { ...animation, x: 0, y: 0, height: 0, rotation: 0, scale: 1 }; }
    paint();
    setDisplay({ key, faceIndex: animation.faceIndex, finished: false });
    const tick = (now: number) => {
      if (flipStarted !== null && redirect) {
        const progress = Math.max(0, Math.min(1, (now - flipStarted - ARROW_PRESENTATION.holdMs) / ARROW_PRESENTATION.flipMs));
        const [x, y] = ARROW_CONFIG[direction!].vector;
        const angle = (progress < 0.5 ? progress : progress - 1) * 180 * (x ? -x : y);
        element.style.transform = reducedMotion ? '' : `perspective(${latest.current.size * 4}px) rotate${x ? 'Y' : 'X'}(${angle}deg)`;
        const faceIndex = progress < 0.5 ? originFace : targetFace;
        setDisplay((previous) => previous.faceIndex === faceIndex && previous.finished === (progress === 1)
          ? previous : { key, faceIndex, finished: progress === 1 });
        if (progress === 1) { latest.current.onFinish(); return; }
      } else {
        const previousFace = animation.faceIndex;
        animation = stepDiceRollAnimation(animation, (now - previousTime) / 1000);
        previousTime = now;
        paint();
        if (previousFace !== animation.faceIndex || animation.isFinished) {
          setDisplay({ key, faceIndex: animation.faceIndex, finished: animation.isFinished && !redirect });
        }
        if (animation.isFinished) {
          if (redirect) flipStarted = now;
          else { latest.current.onFinish(); return; }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      element.style.removeProperty('transform');
      element.style.removeProperty('--roll-rotation');
      element.style.removeProperty('--roll-scale');
    };
  }, [key, targetFace, originFace, direction, faceCount, reroll, flipOnly, reducedMotion]);

  return { ref, faceIndex: key !== null && display.key === key ? display.faceIndex : targetFace,
    rolling: key !== null && (display.key !== key || !display.finished) };
}
