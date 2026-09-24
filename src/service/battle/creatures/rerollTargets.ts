import { CREATURE_CONFIG } from '../../../configs/creatures/creatureConfig';
import type { CreatureBattleState, CreatureId } from '../../../types/creatures';

export interface RerollCandidate { diceId: string; creature: CreatureId; baseValue: number }

export function findTeacherTargets(items: RerollCandidate[], state: CreatureBattleState, teacherId: string): number[] {
  if (!state.teachersAvailable.includes(teacherId)) return [];
  const minimum = Math.min(...items.filter((item) => !CREATURE_CONFIG[item.creature].tags.includes('food')).map((item) => item.baseValue));
  return items.flatMap((item, index) => !CREATURE_CONFIG[item.creature].tags.includes('food') && item.baseValue === minimum
    && !state.lockedDice.includes(item.diceId) && !state.sealedDice?.includes(item.diceId) ? [index] : []);
}

export function findPranksterTargets(items: RerollCandidate[], state: CreatureBattleState, sourceIndex: number): number[] {
  return items.flatMap((item, index) => Math.abs(index - sourceIndex) === 1
    && !state.lockedDice.includes(item.diceId) && !state.sealedDice?.includes(item.diceId) ? [index] : []);
}
