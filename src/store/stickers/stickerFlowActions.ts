import { INVENTORY_CONFIG } from '../../configs/inventoryConfig';
import { canEditStickers, placePermanent } from '../../service/inventory/backpack';
import { createOwnedSticker } from '../../service/inventory/stickerInstances';
import { soundService } from '../../service/audio/soundService';
import type { StickerItem } from '../../types/game';
import type { FlowCompletion, GameState } from '../gameStore.types';

export function createStickerFlowActions(
  set: (patch: Partial<GameState>) => void,
  get: () => GameState,
) {
  const complete = (completion: FlowCompletion) => {
    set({ stickerFlow: null });
    if (completion === 'advance') get().advanceToNextNode();
  };
  const finish = (index: number, used: boolean) => {
    const flow = get().stickerFlow;
    if (!flow) return;
    const items = flow.items.filter((_, position) => position !== index);
    if (used && flow.editing) {
      set({ stickerFlow: { ...flow, items, index: -1, usedAny: true } });
      return;
    }
    if (!items.length) {
      if (flow.rewardGold && !flow.usedAny && !used) set({ gold: get().gold + flow.rewardGold });
      complete(flow.completion);
    } else set({ stickerFlow: { ...flow, items, index: -1, usedAny: flow.usedAny || used } });
  };
  const discard = (index: number) => {
    const item = get().stickerFlow?.items[index];
    if (!item) return;
    if (item.isDisposable) get().discardInventorySticker(item.instanceId);
    finish(index, false);
  };
  return {
    startStickerFlow: (items: StickerItem[], completion: FlowCompletion) =>
      set({ stickerFlow: { items: items.map(createOwnedSticker), index: -1, completion } }),
    actions: {
      storeFlowSticker: (index) => {
        const state = get(),
          item = state.stickerFlow?.items[index];
        if (!item || !canEditStickers(state.combatPhase, state.enemies.length > 0)) return false;
        if (item.isDisposable === false) {
          if (state.permanentStickers.length >= INVENTORY_CONFIG.permanentCapacity) return false;
          set({ permanentStickers: [...state.permanentStickers, item] });
        }
        finish(index, true);
        return true;
      },
      applyCurrentSticker: (diceId, faceIndex, direction) => {
        const state = get(),
          flow = state.stickerFlow,
          sticker = flow?.items[flow.index];
        if (!flow || !sticker || !canEditStickers(state.combatPhase, state.enemies.length > 0))
          return false;
        if (sticker.isDisposable === true) {
          if (!get().placeInventorySticker(sticker.instanceId, diceId, faceIndex, direction))
            return false;
        } else {
          const result = placePermanent(
            state.dicePool,
            state.permanentStickers,
            sticker,
            diceId,
            faceIndex,
          );
          if (!result) return false;
          set({
            ...result,
            temporaryPlacements: state.temporaryPlacements.filter(
              (item) => !(item.diceId === diceId && item.faceIndex === faceIndex),
            ),
          });
          soundService.playStickerApply();
        }
        finish(flow.index, true);
        return true;
      },
      chooseFlowSticker: (index) => {
        const flow = get().stickerFlow;
        if (flow?.items[index]) set({ stickerFlow: { ...flow, index, editing: true } });
      },
      returnToStickerSelection: () => {
        const flow = get().stickerFlow;
        if (!flow) return;
        if (!flow.items.length) complete(flow.completion);
        else set({ stickerFlow: { ...flow, index: -1, editing: false } });
      },
      discardStickerAt: discard,
      skipStickerFlow: () => {
        const flow = get().stickerFlow;
        if (!flow) return;
        flow.items
          .filter((item) => item.isDisposable)
          .forEach((item) => get().discardInventorySticker(item.instanceId));
        if (flow.rewardGold && !flow.usedAny) set({ gold: get().gold + flow.rewardGold });
        complete(flow.completion);
      },
    } satisfies Pick<
      GameState,
      | 'storeFlowSticker'
      | 'applyCurrentSticker'
      | 'chooseFlowSticker'
      | 'returnToStickerSelection'
      | 'discardStickerAt'
      | 'skipStickerFlow'
    >,
  };
}
