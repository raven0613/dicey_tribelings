import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { BattleComboSummary } from '../../types/battle';
import type { CombatPhase } from '../../types/game';
import { getRerollFeedbackDice } from '../../service/battle/hoverRelations';
import { BATTLE_PRESENTATION } from '../../configs/battleConfig';

export function useRerollFeedback(summary: BattleComboSummary | null, rerollId: number, phase: CombatPhase) {
  const history = useRef({ summary, rerollId });
  const before = useRef(summary);
  const [feedback, setFeedback] = useState<{ id: number; diceIds: string[] } | null>(null);
  useLayoutEffect(() => {
    if (history.current.rerollId !== rerollId) before.current = history.current.summary;
    history.current = { summary, rerollId };
    if (phase !== 'CONTROL_PHASE') setFeedback(null);
  }, [summary, rerollId, phase]);
  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), BATTLE_PRESENTATION.pulseMs);
    return () => window.clearTimeout(timeout);
  }, [feedback]);
  const finish = useCallback((diceId: string) => {
    if (summary) setFeedback({ id: rerollId, diceIds: getRerollFeedbackDice(before.current, summary, diceId) });
  }, [summary, rerollId]);
  return { feedback, finish };
}

export function RerollPulse() {
  return <div className="skill-feedback" aria-hidden="true">
    <span className="skill-pulse" style={{ '--pulse-ms': `${BATTLE_PRESENTATION.pulseMs}ms` } as CSSProperties} />
  </div>;
}
