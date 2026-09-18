import { usePreferencesStore } from './preferencesStore';
import { retainPlayerShield } from '../service/battle/playerShield';
import type { GameState } from './gameStore.types';
import { getActionTargets, performControlReroll, performDiceAction, performStartBattleRoll, teacherTargets } from '../service/battle/rollService';
import { calculateRollResolution } from '../service/battle/battleEngine';
import { hasEquipment } from '../configs/equipment/equipmentConfig';

export function createBattleActions(set: (state: Partial<GameState>) => void, get: () => GameState):
  Pick<GameState, 'startBattleRoll' | 'finishRollAnimation' | 'useControlReroll' | 'finishRerollAnimation' | 'setDiceAction' | 'confirmPaidReroll' | 'cancelPaidReroll'> {
  const startNextReroll = () => {
    const state = get();
    const [next, ...pendingRerolls] = state.pendingRerolls;
    if (!next) { set({ activeRerollingIndex: null }); return; }
    set({ pendingRerolls, activeRerollingIndex: next.dieIndex, rerollAnimationId: state.rerollAnimationId + 1,
      rolledIndices: next.rolledIndices, creatureBattleState: next.state,
      comboSummary: calculateRollResolution(state.dicePool, next.rolledIndices, state.equipments, next.state, state) });
  };
  const commitReroll = (index: number, teacherId?: string) => {
    const state = get();
    if (state.activeRerollingIndex !== null) return false;
    const result = performControlReroll(index, state, Math.random, teacherId);
    if (!result) return false;
    set({ control: result.control, gold: result.gold, pendingRerolls: result.steps, diceAction: 'reroll',
      pendingPaidRerollDiceId: null, visibleBonusIds: [], diceSlotStates: {}, bonusSlotStates: {} });
    startNextReroll();
    return true;
  };
  return {
    startBattleRoll: () => {
      const state = get();
      const virtualFood = hasEquipment(state.equipments, 'RATIONS') ? state.storedRations : 0;
      const result = performStartBattleRoll(state.dicePool, state.equipments, state.creatureBattleState, state, virtualFood);
      set({ ...result, playerShield: retainPlayerShield(state.playerShield, state.equipments), storedRations: 0, activeRerollingIndex: null, pendingRerolls: [], diceAction: 'reroll', hoveredEquipmentId: null,
        attackingDieIndex: null, attackingBonusIndex: null, attackingStage: 'idle', attackEmphasis: 0, enemyAttack: null, visibleBonusIds: [],
        diceSlotStates: {}, bonusSlotStates: {}, skillFeedback: [], displayedIdentities: {},
        displayedShields: {}, displayedFood: {}, playerShieldDisplay: null, playerHpDisplay: null });
    },
    finishRollAnimation: () => {
      if (get().combatPhase === 'ROLLING') set({ combatPhase: 'CONTROL_PHASE' });
    },
    setDiceAction: (diceAction) => {
      const state = get();
      if (state.combatPhase !== 'CONTROL_PHASE' || state.activeRerollingIndex !== null || state.pendingPaidRerollDiceId) return;
      if (diceAction !== 'reroll' && !getActionTargets(diceAction, state).length) return;
      if (diceAction.startsWith('teacher:')) {
        const targets = teacherTargets(state, diceAction.slice(8));
        if (!targets.length) return;
        set({ diceAction });
        if (targets.length === 1) get().useControlReroll(targets[0]);
      } else set({ diceAction });
    },
    useControlReroll: (index) => {
      const state = get();
      if (state.activeRerollingIndex !== null || state.pendingPaidRerollDiceId) return;
      if (state.diceAction === 'reroll' || state.diceAction.startsWith('teacher:')) {
        const teacherId = state.diceAction.startsWith('teacher:') ? state.diceAction.slice(8) : undefined;
        if (!getActionTargets(state.diceAction, state).includes(index)) return;
        if (!teacherId && state.control === 0
          && !usePreferencesStore.getState().hidePaidRerollPrompt) {
          set({ pendingPaidRerollDiceId: state.dicePool[index].id });
          return;
        }
        commitReroll(index, teacherId);
      } else {
        const result = performDiceAction(state.diceAction, index, state);
        if (result) set({ ...result, diceAction: 'reroll' });
      }
    },
    confirmPaidReroll: (dontShowAgain) => {
      const state = get();
      if (!state.pendingPaidRerollDiceId) return;
      const index = state.dicePool.findIndex((die) => die.id === state.pendingPaidRerollDiceId);
      if (commitReroll(index) && dontShowAgain) usePreferencesStore.getState().dismissPaidRerollPrompt();
    },
    cancelPaidReroll: () => set({ pendingPaidRerollDiceId: null }),
    finishRerollAnimation: (index) => {
      if (get().activeRerollingIndex === index) startNextReroll();
    },
  };
}
