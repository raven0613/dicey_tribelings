import React from 'react';
import { Dices } from 'lucide-react';
import type { Dice } from '../../types/game';

interface DiceTabsProps {
  dicePool: Dice[];
  selectedDiceId: string;
  onSelect: (diceId: string) => void;
}

export const DiceTabs: React.FC<DiceTabsProps> = ({ dicePool, selectedDiceId, onSelect }) => (
  <nav className="dice-tabs-nav" aria-label="選擇骰子">
    {dicePool.map((die) => <button type="button" key={die.id}
      className="dice-tab-btn" aria-pressed={selectedDiceId === die.id} onClick={() => onSelect(die.id)}>
      <Dices size={18} aria-hidden="true" /><span>{die.name}</span><span className="dice-tab-type">{die.dieType}</span>
    </button>)}
  </nav>
);
