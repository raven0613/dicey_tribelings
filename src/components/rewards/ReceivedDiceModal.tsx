import type { Dice } from '../../types/game';
import { DiceNet } from '../dice/DiceNet';

interface ReceivedDiceModalProps {
  dice: Dice;
  diceCount: number;
  inspectingDice: boolean;
  onOpenDiceBag: () => void;
  onContinue: () => void;
}

export function ReceivedDiceModal({ dice, diceCount, inspectingDice, onOpenDiceBag, onContinue }: ReceivedDiceModalProps) {
  return <div className="modal-overlay" inert={inspectingDice} aria-hidden={inspectingDice || undefined}>
    <div className="reward-card" role="dialog" aria-modal="true" aria-labelledby="received-dice-title">
      <div className="reward-header">
        <h2 id="received-dice-title">獲得新骰子</h2>
        <button type="button" className="btn-view-dice" onClick={onOpenDiceBag}>查看骰池</button>
      </div>
      <div className="reward-body">
        <h3>{dice.name}</h3>
        <DiceNet dice={dice} />
      </div>
      <div className="reward-footer">
        <button type="button" className="btn-primary-modal" onClick={onContinue}>繼續</button>
      </div>
    </div>
  </div>;
}
