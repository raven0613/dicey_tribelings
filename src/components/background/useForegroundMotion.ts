import { useLayoutEffect, useRef } from 'react';
import type { BackgroundScene } from '../../types/background';
import { useGameStore } from '../../store/gameStore';
import { useGameViewport } from '../layout/GameViewportContext';
import { createForegroundController } from '../../service/background/foreground/controller';
import { getForegroundImpact } from '../../service/background/foreground/impact';

export function useForegroundMotion(scene: BackgroundScene) {
  const root = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<ReturnType<typeof createForegroundController> | null>(null);
  const { scale } = useGameViewport();
  useLayoutEffect(() => {
    const instance = createForegroundController(root.current!, canvas.current!, scene);
    controller.current = instance;
    // Synchronous store subscription captures every impact, including multiple hits before a React render.
    const unsubscribe = useGameStore.subscribe((state, previous) => {
      if (state.currentNodeIndex !== previous.currentNodeIndex || state.mapNodes !== previous.mapNodes) {
        instance.reset(); return;
      }
      const gain = getForegroundImpact(state.combatImpact, previous.combatImpact, state.enemyAttack);
      if (gain) instance.impact(gain);
    });
    return () => { unsubscribe(); instance.destroy(); controller.current = null; };
  }, [scene]);
  useLayoutEffect(() => { controller.current?.resize(scale); }, [scale, scene]);
  return { root, canvas };
}
