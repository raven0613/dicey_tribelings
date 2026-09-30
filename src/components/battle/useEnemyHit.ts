import { useLayoutEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ENEMY_PRESENTATION } from '../../configs/monsters/enemyPresentationConfig';

/** Independent of the attack transform; every hit resumes the current visible pose. */
export function useEnemyHit(enemyId: string) {
  const body = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const config = ENEMY_PRESENTATION.hit;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let motion: Animation | null = null;
    let light: Animation | null = null;
    let direction = 1;

    const reset = () => {
      motion?.cancel();
      light?.cancel();
      motion = null;
      light = null;
    };

    const unsubscribe = useGameStore.subscribe((state, previous) => {
      if (state.currentNodeIndex !== previous.currentNodeIndex || state.mapNodes !== previous.mapNodes) {
        reset();
        return;
      }
      if (document.hidden || state.activeEnemyId !== enemyId || state.combatImpact === previous.combatImpact
        || !state.combatImpact || state.combatImpact.kind === 'enemy') return;

      const element = body.current!;
      if (!reduced.matches) {
        const pose = getComputedStyle(element).transform;
        motion?.cancel();
        direction *= -1;
        const frames: Keyframe[] = [{ transform: pose, offset: 0 }];

        for (const [index, sample] of config.shake.entries()) {
          const x = direction * config.shift * sample.gain;
          const y = -config.lift * sample.gain;
          const tilt = direction * config.tilt * sample.gain;
          // Compression is confined to contact; the remaining shake preserves the artwork's proportions.
          const compression = index === 0 ? config.compression : 0;
          frames.push({
            transform: `translate(${x}px, ${y}px) rotate(${tilt}deg) scale(${1 + compression}, ${1 - compression})`,
            offset: sample.offset,
          });
        }

        motion = element.animate(frames, {
          duration: config.durationMs,
          easing: 'linear',
        });
        motion.onfinish = () => { motion = null; };
      }

      light?.cancel();
      light = flash.current!.animate([
        { opacity: reduced.matches ? config.reducedFlashOpacity : config.flashOpacity },
        { opacity: 0 },
      ], {
        duration: config.flashMs,
        easing: 'ease-out',
      });
      light.onfinish = () => { light = null; };
    });

    const hide = () => {
      if (document.hidden) reset();
    };
    document.addEventListener('visibilitychange', hide);
    reduced.addEventListener('change', reset);

    return () => {
      unsubscribe();
      reset();
      document.removeEventListener('visibilitychange', hide);
      reduced.removeEventListener('change', reset);
    };
  }, [enemyId]);

  return { body, flash };
}
