import React, { useRef, useState } from 'react';
import { Dices } from 'lucide-react';
import type { Dice } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import { canReorderDice } from '../../service/dice/diceOrder';
import { DICE_REORDER_PRESENTATION } from '../../configs/dicePresentationConfig';

interface DiceTabsProps {
  dicePool: Dice[];
  matchCounts?: Record<string, number>;
  selectedDiceId: string;
  onSelect: (diceId: string) => void;
}
export function DiceTabs({ dicePool, selectedDiceId, onSelect, matchCounts }: DiceTabsProps) {
  const phase = useGameStore((state) => state.combatPhase);
  const hasEnemy = useGameStore((state) => state.currentEnemy !== null);
  const moveDice = useGameStore((state) => state.moveDice);
  const enabled = canReorderDice(phase, hasEnemy);
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean; index: number } | null>(null);
  const suppressClick = useRef(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const cancel = () => { drag.current = null; setDropIndex(null); };
  return <nav className={`dice-tabs-nav ${enabled ? 'can-reorder' : ''}`} aria-label="選擇骰子">
    {dicePool.map((die, index) => <button type="button" key={die.id} data-dice-tab={die.id}
      className={`dice-tab-btn ${matchCounts ? matchCounts[die.id] ? 'is-match' : 'is-muted' : ''} ${dropIndex === index ? 'is-drop-target' : ''}`}
      aria-pressed={selectedDiceId === die.id}
      onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } onSelect(die.id); }}
      onPointerDown={(event) => {
        if (!enabled || event.button !== 0) return;
        suppressClick.current = false;
        drag.current = { id: die.id, x: event.clientX, y: event.clientY, moved: false, index };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!enabled || !current) return;
        if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < DICE_REORDER_PRESENTATION.threshold && !current.moved) return;
        current.moved = true;
        const nav = event.currentTarget.parentElement!;
        const bounds = nav.getBoundingClientRect();
        if (event.clientX < bounds.left + DICE_REORDER_PRESENTATION.scrollEdge) nav.scrollLeft -= DICE_REORDER_PRESENTATION.scrollStep;
        if (event.clientX > bounds.right - DICE_REORDER_PRESENTATION.scrollEdge) nav.scrollLeft += DICE_REORDER_PRESENTATION.scrollStep;
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-dice-tab]');
        const index = dicePool.findIndex((entry) => entry.id === target?.dataset.diceTab);
        if (index >= 0) { current.index = index; setDropIndex(index); }
      }}
      onPointerUp={() => {
        const current = drag.current;
        if (current?.moved && enabled) { moveDice(current.id, current.index); suppressClick.current = true; }
        cancel();
      }}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onKeyDown={(event) => {
        if (!enabled || !event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        moveDice(die.id, index + (event.key === 'ArrowLeft' ? -1 : 1));
      }}>
      <Dices className="ui-icon" aria-hidden="true" /><span>{die.name}</span><span className="dice-tab-type">{die.dieType}</span>{matchCounts && <span>{matchCounts[die.id]} 面</span>}
    </button>)}
  </nav>;
}
