import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../store/gameStore';
import { SHIELD_GAIN_PRESENTATION } from '../../configs/numberFeedbackConfig';
import { BATTLE_PRESENTATION } from '../../configs/battleConfig';
import { useGameViewport } from '../layout/GameViewportContext';
import { useSkillNameLayout } from './useSkillNameLayout';
import './rerollShieldFeedback.scss';

export function RerollShieldFeedback() {
  const [gains, setGains] = useState<{ id: string; value: number }[]>([]);
  const anchorRef = useRef<HTMLDivElement>(null);
  const layerRef = useSkillNameLayout(anchorRef, gains);
  const { overlay } = useGameViewport();
  useEffect(() => useGameStore.subscribe((state, previous) => {
    if (state.combatPhase !== 'CONTROL_PHASE') {
      setGains(current => current.length ? [] : current);
      return;
    }
    if (state.rerollAnimationId === previous.rerollAnimationId) return;
    const value = Object.entries(state.creatureBattleState.cowardShields).reduce((sum, [id, amount]) =>
      sum + amount - (previous.creatureBattleState.cowardShields[id] ?? 0), 0);
    if (value > 0) setGains(current => [...current, { id: `shield-${state.rerollAnimationId}`, value }]);
  }), []);

  return <>
    <div ref={anchorRef} className="reroll-shield-anchor" aria-hidden="true" />
    {overlay && gains.length > 0 && createPortal(<div ref={layerRef} className="skill-name-layer" aria-hidden="true"
      style={{ '--shield-gain-ms': `${SHIELD_GAIN_PRESENTATION.lifetimeMs}ms`,
        '--shield-gain-rise': `${BATTLE_PRESENTATION.nameRisePx}px` } as CSSProperties}>
      {gains.map(gain => <span key={gain.id} data-event-id={gain.id} className="skill-name reroll-shield-gain"
        onAnimationEnd={() => setGains(current => current.filter(item => item.id !== gain.id))}>+{gain.value}</span>)}
    </div>, overlay)}
  </>;
}
