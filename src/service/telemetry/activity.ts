import { ACTIVITY_LABELS } from '../../configs/telemetryConfig';
import type { Activity, ActivityTotals } from './decisionTypes';
import type { TelemetryState } from './types';

export const emptyActivityTotals = (): ActivityTotals =>
  Object.fromEntries(Object.keys(ACTIVITY_LABELS).map((key) => [key, 0])) as ActivityTotals;
export function activityOf(state: TelemetryState): Activity {
  if (state.stickerFlow?.editing || state.selectedDiceForInspect) return 'configuration';
  if (
    state.stickerFlow ||
    state.openedPackResult ||
    state.pendingEquipment ||
    state.pendingShopSticker ||
    state.receivedRewardDice ||
    state.extraReward ||
    state.diceRewardOptions?.length ||
    state.battleRewardOptions?.length ||
    state.chestRewardOptions?.length
  )
    return 'reward';
  if (state.routeChoices?.length) return 'route';
  if (state.enemies.length) {
    if (state.combatPhase === 'PREPARATION') return 'configuration';
    if (state.combatPhase === 'CONTROL_PHASE')
      return state.activeRerollingIndex != null ? 'combatAnimation' : 'combatDecision';
    if (
      ['ROLLING', 'RESOLVING_CALCULATION', 'RESOLVING_ATTACK', 'ENEMY_TURN'].includes(
        state.combatPhase,
      )
    )
      return 'combatAnimation';
  }
  const node = state.mapNodes[state.currentNodeIndex];
  return node.type === 'shop' ? 'shop' : node.type === 'camp' ? 'camp' : 'other';
}
