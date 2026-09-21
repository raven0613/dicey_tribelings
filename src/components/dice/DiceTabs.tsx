import React from 'react';
import { Dices } from 'lucide-react';
import type { Dice } from '../../types/game';

interface DiceTabsProps {
  dicePool: Dice[];
  matchCounts?: Record<string, number>;
  selectedDiceId: string;
  onSelect: (diceId: string) => void;
}

export const DiceTabs: React.FC<DiceTabsProps> = ({ dicePool, selectedDiceId, onSelect, matchCounts }) => (
  <nav className="dice-tabs-nav" aria-label="選擇骰子">
    {dicePool.map((die) => <button type="button" key={die.id}
      className={`dice-tab-btn ${matchCounts ? matchCounts[die.id] ? 'is-match' : 'is-muted' : ''}`} aria-pressed={selectedDiceId === die.id} onClick={() => onSelect(die.id)}>
      <Dices className="ui-icon" aria-hidden="true" /><span>{die.name}</span><span className="dice-tab-type">{die.dieType}</span>{matchCounts && <span>{matchCounts[die.id]} 面</span>}
    </button>)}
  </nav>
);
