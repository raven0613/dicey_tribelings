import type { GameState } from '../../store/gameStore.types';
import type { DecisionInput } from './decisionTypes';
import { inventoryChanges } from './inventoryRecord';
import { locationOf } from './snapshot';

/** Called after a successful operation, before finishing its flow or leaving its node. */
export function recordDecision(
  set: (patch: Partial<GameState>) => void,
  before: GameState,
  after: GameState,
  input: DecisionInput,
) {
  set({
    telemetryDecision: {
      ...input,
      location: locationOf(before),
      ...(input.source === 'battle' ? { round: before.creatureBattleState.round } : {}),
      resources: {
        gold: { before: before.gold, after: after.gold },
        hp: { before: before.playerHp, after: after.playerHp },
        control: { before: before.control, after: after.control },
      },
      changes: inventoryChanges(before, after),
    },
  });
}
