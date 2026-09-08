import type { GameState } from '../../store/gameStore.types';
import { useStoryStore } from '../../store/storyStore';

// Observe committed game events; dialogue never owns rewards or advances inventory flows.
export function syncStoryProgress(state: GameState, previous: GameState): void {
  const story = useStoryStore.getState();
  if (story.screen !== 'game') return;
  const node = state.mapNodes[state.currentNodeIndex];
  const leftChest = node?.type !== 'chest' || state.chestRewardOptions.length === 0
    || !!state.openedPackResult || !!state.pendingEquipment;
  if (leftChest) story.leaveChest();
  if (!leftChest && previous.chestRewardOptions.length === 0) story.enqueue('chest');

  if (state.currentNodeIndex === 0 && state.currentEnemy) {
    if (state.combatPhase === 'PREPARATION' && state.currentEnemy !== previous.currentEnemy) story.enqueue('battle');
    if (state.combatPhase === 'CONTROL_PHASE' && previous.combatPhase === 'ROLLING') story.enqueue('control');
  }
  if (state.consumableStickers.some((item) => !previous.consumableStickers.some((old) => old.instanceId === item.instanceId))) {
    story.unlockTemporary();
  }
  const sticker = state.stickerFlow?.items[state.stickerFlow.index];
  if (sticker?.creature === 'princess' && !sticker.isDisposable) story.enqueue('princess');

  if (state.combatPhase === 'VICTORY' && previous.combatPhase !== 'VICTORY'
    && state.currentEnemy?.isBoss && state.currentEnemy.region === 6) story.enqueue('ending');
}
