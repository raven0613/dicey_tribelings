import { useLayoutEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PLAYER_IMPACT_PRESENTATION as config } from '../../configs/playerImpactConfig';

export function useGameImpactFrame(mounted: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!mounted) return;
    const element = ref.current!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animation: Animation | null = null;
    let peak = 0;
    const reset = () => {
      animation?.cancel();
      animation = null;
      peak = 0;
    };
    const unsubscribe = useGameStore.subscribe((state, previous) => {
      if (state.currentNodeIndex !== previous.currentNodeIndex || state.mapNodes !== previous.mapNodes) {
        reset(); return;
      }
      const attack = state.enemyAttack;
      if (document.hidden || state.combatImpact === previous.combatImpact
        || state.combatImpact?.kind !== 'enemy' || attack?.stage !== 'impact'
        || attack.healthDamage + attack.shieldDamage <= 0) return;

      // Linear opacity decay lets each hit continue from the current brightness without reading layout.
      const elapsed = Number(animation?.currentTime ?? 0);
      const current = animation ? peak * Math.max(0, 1 - elapsed / config.fadeMs) : 0;
      const motionGain = reduced.matches ? config.reducedMotionGain : 1;
      peak = Math.min(config.maxOpacity * motionGain,
        current + config.opacityPerHit * motionGain * (attack.heavy ? config.heavyGain : 1));
      animation?.cancel();
      element.style.setProperty('--impact-color', attack.healthDamage > 0 ? config.colors.health : config.colors.shield);
      animation = element.animate([{ opacity: peak }, { opacity: 0 }], {
        duration: config.fadeMs, easing: 'linear',
      });
      animation.onfinish = () => { animation = null; peak = 0; };
    });
    const visibilityChanged = () => { if (document.hidden) reset(); };
    document.addEventListener('visibilitychange', visibilityChanged);
    reduced.addEventListener('change', reset);
    return () => {
      unsubscribe(); reset();
      document.removeEventListener('visibilitychange', visibilityChanged);
      reduced.removeEventListener('change', reset);
    };
  }, [mounted]);
  return ref;
}
