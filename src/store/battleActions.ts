import type { GameState } from './gameStore.types';
import { performControlReroll, performDiceAction, performStartBattleRoll } from '../service/battle/rollService';
import { calculateRollResolution } from '../service/battle/battleEngine';
import { hasEquipment } from '../configs/equipment/equipmentConfig';

export function createBattleActions(set: (state: Partial<GameState>) => void, get: () => GameState):
  Pick<GameState, 'startBattleRoll' | 'finishRollAnimation' | 'useControlReroll' | 'finishRerollAnimation' | 'setDiceAction'> {
  const startNextReroll = () => {
    const state = get();
    const [next, ...pendingRerolls] = state.pendingRerolls;
    if (!next) { set({ activeRerollingIndex: null }); return; }
    set({ pendingRerolls, activeRerollingIndex: next.dieIndex, rerollAnimationId: state.rerollAnimationId + 1,
      rolledIndices: next.rolledIndices, creatureBattleState: next.state,
      comboSummary: calculateRollResolution(state.dicePool, next.rolledIndices, state.equipments, next.state, state) });
  };
  return {
    startBattleRoll: () => {
      const state = get();
      const virtualFood = hasEquipment(state.equipments, 'RATIONS') ? state.storedRations : 0;
      const result = performStartBattleRoll(state.dicePool, state.equipments, state.creatureBattleState, state, virtualFood);
      set({ ...result, storedRations: 0, activeRerollingIndex: null, pendingRerolls: [], diceAction: 'reroll',
        attackingDieIndex: null, attackingBonusIndex: null, attackingStage: 'idle', visibleBonusIds: [],
        diceSlotStates: {}, bonusSlotStates: {}, skillFeedback: [], displayedIdentities: {},
        displayedShields: {}, displayedFood: {}, playerShieldDisplay: null });
    },
    finishRollAnimation: () => {
      if (get().combatPhase === 'ROLLING') set({ combatPhase: 'CONTROL_PHASE' });
    },
    setDiceAction: (diceAction) => {
      if (get().combatPhase === 'CONTROL_PHASE' && get().activeRerollingIndex === null) set({ diceAction });
    },
    useControlReroll: (index) => {
      const state = get();
      if (state.activeRerollingIndex !== null) return;
      if (state.diceAction === 'reroll' || state.diceAction.startsWith('teacher:')) {
        const teacherId = state.diceAction.startsWith('teacher:') ? state.diceAction.slice(8) : undefined;
        const result = performControlReroll(index, state, Math.random, teacherId);
        if (!result) return;
        set({ control: result.control, gold: result.gold, pendingRerolls: result.steps, diceAction: 'reroll',
          visibleBonusIds: [], diceSlotStates: {}, bonusSlotStates: {} });
        startNextReroll();
      } else {
        const result = performDiceAction(state.diceAction, index, state);
        if (result) set({ ...result, diceAction: 'reroll' });
      }
    },
    finishRerollAnimation: (index) => {
      if (get().activeRerollingIndex === index) startNextReroll();
    },
  };
}
