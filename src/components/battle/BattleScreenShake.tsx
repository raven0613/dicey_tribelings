import { useMemo, type ReactNode } from 'react';
import { useGameStore } from '../../store/gameStore';

export function BattleScreenShake({ children }: { children: ReactNode }) {
  const intensity = useGameStore((state) => state.screenShakeIntensity);
  const transform = useMemo(() => intensity > 0
    ? `translate(${(Math.random() - 0.5) * intensity}px, ${(Math.random() - 0.5) * intensity}px)`
    : 'none', [intensity]);
  return <div className="app-wrapper" style={{ transform }}>{children}</div>;
}
