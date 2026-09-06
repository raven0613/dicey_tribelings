import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { EQUIPMENT_BALANCE as eq, hasEquipment } from '../../configs/equipment/equipmentConfig';
import type { DiceAction } from '../../service/battle/rollService';

export function DiceActionBar() {
  const { diceAction, setDiceAction, equipments, dicePool, creatureBattleState, combatPhase, activeRerollingIndex } = useGameStore();
  const buttons: { action: DiceAction; label: string; disabled?: boolean }[] = [{ action: 'reroll', label: '重骰' }];
  if (hasEquipment(equipments, 'FORMATION')) buttons.push({ action: 'swap', label: `換位 · ${eq.formationCost} Control`, disabled: creatureBattleState.formationUsed });
  if (hasEquipment(equipments, 'WHISTLE')) buttons.push({ action: 'lock', label: `保護 · ${eq.whistleCost} Control`, disabled: creatureBattleState.whistleUsed });
  if (hasEquipment(equipments, 'PRISM')) buttons.push({ action: 'flip', label: `翻面 · ${eq.prismCost} Control` });
  for (const id of creatureBattleState.teachersAvailable) buttons.push({ action: `teacher:${id}`, label: `${dicePool.find((die) => die.id === id)?.name} · 老師` });
  return <div className="dice-action-bar" aria-label="骰子操作">
    {buttons.map(({ action, label, disabled }) => <button key={action} type="button"
      className={diceAction === action ? 'selected' : ''} aria-pressed={diceAction === action}
      disabled={disabled || combatPhase !== 'CONTROL_PHASE' || activeRerollingIndex !== null}
      onClick={() => setDiceAction(action)}>{label}</button>)}
  </div>;
}
