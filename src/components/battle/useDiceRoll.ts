import { useLayoutEffect, useRef, useState } from 'react';
import { DICE_TRAY_PRESENTATION } from '../../configs/dicePresentationConfig';
import { createDiceRollAnimation, stepDiceRollAnimation } from '../../service/dice/diceRollAnimation';

/** Only face changes enter React; motion stays local to the die's transform. */
export function useDiceRoll(key: string | null, targetFace: number, faceCount: number,
  size: number, reroll: boolean, onFinish: () => void) {
  const ref = useRef<HTMLButtonElement>(null);
  const latest = useRef({ size, onFinish });
  useLayoutEffect(() => { latest.current = { size, onFinish }; });
  const [display, setDisplay] = useState({ key, faceIndex: targetFace, finished: false });

  useLayoutEffect(() => {
    if (key === null) return;
    const element = ref.current!;
    let animation = createDiceRollAnimation(0, 0, targetFace, faceCount, reroll);
    let previousTime = performance.now();
    let frame: number;
    const paint = () => {
      const ratio = latest.current.size / DICE_TRAY_PRESENTATION.size;
      element.style.transform = `translate3d(${animation.x * ratio}px, ${(animation.y - animation.height) * ratio}px, 0)`;
      element.style.setProperty('--roll-rotation', `${animation.rotation}deg`);
      element.style.setProperty('--roll-scale', String(animation.scale));
    };
    paint();
    setDisplay({ key, faceIndex: animation.faceIndex, finished: false });
    const tick = (now: number) => {
      const previousFace = animation.faceIndex;
      animation = stepDiceRollAnimation(animation, (now - previousTime) / 1000);
      previousTime = now;
      paint();
      if (previousFace !== animation.faceIndex || animation.isFinished) {
        setDisplay({ key, faceIndex: animation.faceIndex, finished: animation.isFinished });
      }
      if (animation.isFinished) latest.current.onFinish();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      element.style.removeProperty('transform');
      element.style.removeProperty('--roll-rotation');
      element.style.removeProperty('--roll-scale');
    };
  }, [key, targetFace, faceCount, reroll]);

  return { ref, faceIndex: key !== null && display.key === key ? display.faceIndex : targetFace,
    rolling: key !== null && (display.key !== key || !display.finished) };
}
