import { EQUIPMENT_ACTIONS } from '../configs/equipment/equipmentActionConfig';
import { recordDecision } from '../service/telemetry/commit';
import { rerollDetail } from '../service/telemetry/combatDetails';
import type { RerollDetail } from '../service/telemetry/decisionTypes';
import { isArrowFace } from '../configs/directionalStickerConfig';
import { getEffectiveFace } from '../service/dice/diceFaces';
import { usePreferencesStore } from './preferencesStore';
import { retainPlayerShield } from '../service/battle/playerShield';
import type { GameState } from './gameStore.types';
import {
  getActionTargets,
  performControlReroll,
  performDiceAction,
  performStartBattleRoll,
  teacherTargets,
} from '../service/battle/rollService';
import { calculateRollResolution } from '../service/battle/battleEngine';
import { hasEquipment } from '../configs/equipment/equipmentConfig';

export function createBattleActions(
  set: (state: Partial<GameState>) => void,
  get: () => GameState,
): Pick<
  GameState,
  | 'startBattleRoll'
  | 'finishRollAnimation'
  | 'useControlReroll'
  | 'finishRerollAnimation'
  | 'setDiceAction'
  | 'confirmPaidReroll'
  | 'cancelPaidReroll'
  | 'toggleSplit'
> {
  const startNextReroll = (
    before = get(),
    reason: RerollDetail['reason'] = 'chain',
    teacherId?: string,
  ) => {
    const state = get();
    const [next, ...pendingRerolls] = state.pendingRerolls;
    if (!next) {
      set({ activeRerollingIndex: null });
      return;
    }
    set({
      pendingRerolls,
      rerollAnimationMode: 'roll',
      activeRerollingIndex: next.dieIndex,
      rerollAnimationId: state.rerollAnimationId + 1,
      rolledIndices: next.rolledIndices,
      creatureBattleState: next.state,
      comboSummary: calculateRollResolution(
        state.dicePool,
        next.rolledIndices,
        state.equipments,
        next.state,
        state,
      ),
    });
    recordDecision(set, before, get(), {
      kind: 'reroll',
      source: 'battle',
      rerolls: [rerollDetail(before, next, reason, teacherId)],
    });
  };
  const commitReroll = (index: number, teacherId?: string) => {
    const state = get();
    if (state.activeRerollingIndex !== null) return false;
    const result = performControlReroll(index, state, Math.random, teacherId);
    if (!result) return false;
    set({
      control: result.control,
      gold: result.gold,
      pendingRerolls: result.steps,
      diceAction: 'reroll',
      pendingPaidRerollDiceId: null,
      visibleBonusIds: [],
      diceSlotStates: {},
      bonusSlotStates: {},
    });
    startNextReroll(state, teacherId ? 'teacher' : 'manual', teacherId);
    return true;
  };
  return {
    toggleSplit: () => {
      const state = get();
      if (
        !state.enemies.length ||
        state.combatPhase !== 'CONTROL_PHASE' ||
        state.activeRerollingIndex !== null ||
        state.pendingPaidRerollDiceId ||
        !hasEquipment(state.equipments, 'SPLIT')
      )
        return;
      const creatureBattleState = {
        ...state.creatureBattleState,
        splitEnabled: !state.creatureBattleState.splitEnabled,
      };
      set({
        creatureBattleState,
        comboSummary: calculateRollResolution(
          state.dicePool,
          state.rolledIndices,
          state.equipments,
          creatureBattleState,
          state,
        ),
      });
    },
    startBattleRoll: () => {
      const state = get();
      const storedRations = hasEquipment(state.equipments, 'RATIONS') ? state.storedRations : 0;
      const result = performStartBattleRoll(
        state.dicePool,
        state.equipments,
        state.creatureBattleState,
        state,
        storedRations,
      );
      set({
        ...result,
        playerShield: retainPlayerShield(state.playerShield, state.equipments),
        storedRations: 0,
        activeRerollingIndex: null,
        pendingRerolls: [],
        diceAction: 'reroll',
        hoveredEquipmentId: null,
        attackingDieIndex: null,
        attackingBonusIndex: null,
        attackingStage: 'idle',
        attackEmphasis: 0,
        enemyAttack: null,
        visibleBonusIds: [],
        diceSlotStates: {},
        bonusSlotStates: {},
        skillFeedback: [],
        displayedIdentities: {},
        displayedShields: {},
        displayedFood: {},
        playerShieldDisplay: null,
        playerHpDisplay: null,
      });
    },
    finishRollAnimation: () => {
      if (get().combatPhase === 'ROLLING') set({ combatPhase: 'CONTROL_PHASE' });
    },
    setDiceAction: (diceAction) => {
      const state = get();
      if (
        state.combatPhase !== 'CONTROL_PHASE' ||
        state.activeRerollingIndex !== null ||
        state.pendingPaidRerollDiceId
      )
        return;
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
        const teacherId = state.diceAction.startsWith('teacher:')
          ? state.diceAction.slice(8)
          : undefined;
        if (!getActionTargets(state.diceAction, state).includes(index)) return;
        if (
          !teacherId &&
          state.control === 0 &&
          !usePreferencesStore.getState().hidePaidRerollPrompt
        ) {
          set({ pendingPaidRerollDiceId: state.dicePool[index].id });
          return;
        }
        commitReroll(index, teacherId);
      } else {
        const result = performDiceAction(state.diceAction, index, state);
        if (result) {
          const origin = result.creatureBattleState.rollOrigins[state.dicePool[index].id];
          const redirect =
            state.diceAction === 'flip' &&
            origin !== undefined &&
            isArrowFace(getEffectiveFace(result.dicePool[index].faces[origin]).creature);
          set({
            ...result,
            diceAction: 'reroll',
            ...(redirect
              ? {
                  activeRerollingIndex: index,
                  rerollAnimationId: state.rerollAnimationId + 1,
                  rerollAnimationMode: 'flip' as const,
                }
              : {}),
          });
          recordDecision(set, state, get(), {
            kind: 'diceAction',
            source: 'battle',
            label: Object.values(EQUIPMENT_ACTIONS).find(
              (action) => action.action === state.diceAction,
            )!.label,
            choiceId: state.dicePool[index].id,
          });
        }
      }
    },
    confirmPaidReroll: (dontShowAgain) => {
      const state = get();
      if (!state.pendingPaidRerollDiceId) return;
      const index = state.dicePool.findIndex((die) => die.id === state.pendingPaidRerollDiceId);
      if (commitReroll(index) && dontShowAgain)
        usePreferencesStore.getState().dismissPaidRerollPrompt();
    },
    cancelPaidReroll: () => set({ pendingPaidRerollDiceId: null }),
    finishRerollAnimation: (index) => {
      if (get().activeRerollingIndex === index) startNextReroll();
    },
  };
}
