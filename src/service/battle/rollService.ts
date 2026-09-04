import { Dice, Equipment, CombatPhase } from '../../types/game';
import { predetermineRollResults, calculateRollResolution, BattleComboSummary } from './battleEngine';
import { soundService } from '../audio/soundService';

export function performStartBattleRoll(
  dicePool: Dice[],
  equipments: Equipment[]
): {
  rolledIndices: number[];
  comboSummary: BattleComboSummary;
  combatPhase: CombatPhase;
} {
  const preResults = predetermineRollResults(dicePool);
  const summary = calculateRollResolution(dicePool, preResults, equipments);
  soundService.playDiceRoll();
  return {
    rolledIndices: preResults,
    comboSummary: summary,
    combatPhase: 'ROLLING',
  };
}

export function performControlReroll(
  dieIndex: number,
  state: {
    control: number;
    dicePool: Dice[];
    rolledIndices: number[];
    equipments: Equipment[];
    combatPhase: CombatPhase;
  }
): {
  success: boolean;
  newControl?: number;
  newRolledIndices?: number[];
  newSummary?: BattleComboSummary;
} {
  const { control, dicePool, rolledIndices, equipments, combatPhase } = state;
  if (combatPhase !== 'CONTROL_PHASE' || control <= 0) return { success: false };
  const targetDie = dicePool[dieIndex];
  if (!targetDie) return { success: false };

  soundService.playControlReroll();
  const newFaceIndex = Math.floor(Math.random() * targetDie.faces.length);
  const newRolled = [...rolledIndices];
  newRolled[dieIndex] = newFaceIndex;
  const newSummary = calculateRollResolution(dicePool, newRolled, equipments);

  return {
    success: true,
    newControl: control - 1,
    newRolledIndices: newRolled,
    newSummary,
  };
}
