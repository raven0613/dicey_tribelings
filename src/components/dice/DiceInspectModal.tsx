import { useShallow } from 'zustand/react/shallow';
import type { CreatureId } from '../../types/creatures';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { getEffectiveFace } from '../../service/dice/diceFaces';
import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { DiceNet } from './DiceNet';
import { DiceTabs } from './DiceTabs';
import { Dices, X } from 'lucide-react';

interface DiceInspectModalProps {
  isOpen: boolean;
  creature?: CreatureId;
  onClose: () => void;
}

export const DiceInspectModal: React.FC<DiceInspectModalProps> = ({ isOpen, onClose, creature }) => {
  const { dicePool, creatureBattleState } = useGameStore(useShallow((state) => ({
    dicePool: state.dicePool,
    creatureBattleState: state.creatureBattleState,
  })));
  const [selectedDiceId, setSelectedDiceId] = useState<string>(dicePool[0]?.id || '');
  const matchCounts = creature ? Object.fromEntries(dicePool.map((die) => [die.id,
  die.faces.filter((face) => getEffectiveFace(face).creature === creature).length])) : undefined;
  useEffect(() => {
    if (isOpen && creature) setSelectedDiceId(dicePool.find((die) => die.faces.some((face) => getEffectiveFace(face).creature === creature))?.id ?? dicePool[0]?.id ?? '');
  }, [isOpen, creature, dicePool]);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    return () => opener.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDie = dicePool.find((d) => d.id === selectedDiceId) || dicePool[0];
  return (
    <div className="modal-overlay dice-net-overlay dice-inspect-overlay"
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      <div className="dice-net-dialog" role="dialog" aria-modal="true" aria-labelledby="dice-inspect-title">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge">
              <Dices size={20} />
            </div>
            <div className="modal-title-box">
              <div className="modal-title" id="dice-inspect-title">骰池庫藏 • 骰面展開圖</div>
              <div className="modal-subtitle">{creature ? `${CREATURE_CONFIG[creature].name}：共 ${Object.values(matchCounts!).reduce((sum, count) => sum + count, 0)} 面・${Object.values(matchCounts!).filter(Boolean).length} 顆骰子` : `目前持有 ${dicePool.length} 顆骰子，查看骰面與構築關係`}</div>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            aria-label="關閉骰面檢視"
          >
            <X size={18} />
          </button>
        </div>

        <DiceTabs matchCounts={matchCounts} dicePool={dicePool} selectedDiceId={currentDie?.id} onSelect={setSelectedDiceId} />

        {currentDie && (
          <div className="dice-net-body">
            <DiceNet key={currentDie.id} dice={currentDie} highlightCreature={creature} />
          </div>
        )}
      </div>
    </div>
  );
};
