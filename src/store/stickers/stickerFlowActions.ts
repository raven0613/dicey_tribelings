import { recordDecision } from '../../service/telemetry/commit';
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
      if (flow.rewardGold && !flow.usedAny && !used) {
        const before = get();
        set({ gold: before.gold + flow.rewardGold });
        recordDecision(set, before, get(), {
          kind: 'income',
          source: 'reward',
          label: '放棄全部戰利品',
        });
      }
      complete(flow.completion);
    } else set({ stickerFlow: { ...flow, items, index: -1, usedAny: flow.usedAny || used } });
  };
  const discard = (index: number) => {
    const state = get();
    const item = state.stickerFlow?.items[index];
    if (!item) return;
    if (item.isDisposable)
      set({
        consumableStickers: state.consumableStickers.filter(
          (value) => value.instanceId !== item.instanceId,
        ),
        temporaryPlacements: state.temporaryPlacements.filter(
          (value) => value.consumable.instanceId !== item.instanceId,
        ),
      });
    recordDecision(
      set,
      state,
      {
        ...get(),
        stickerFlow: {
          ...state.stickerFlow!,
          items: state.stickerFlow!.items.filter((_, i) => i !== index),
        },
      },
      { kind: 'discard', source: 'backpack', items: [item] },
    );
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
        recordDecision(set, state, get(), { kind: 'store', source: 'backpack', items: [item] });
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
          recordDecision(set, state, get(), {
            kind: 'place',
            source: 'backpack',
            items: [sticker],
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
        const state = get();
        const flow = state.stickerFlow;
        if (!flow) return;
        const discardedIds = new Set(flow.items.map((item) => item.instanceId));
        set({
          consumableStickers: state.consumableStickers.filter(
            (item) => !discardedIds.has(item.instanceId),
          ),
          temporaryPlacements: state.temporaryPlacements.filter(
            (item) => !discardedIds.has(item.consumable.instanceId),
          ),
        });
        if (flow.rewardGold && !flow.usedAny) set({ gold: get().gold + flow.rewardGold });
        recordDecision(
          set,
          state,
          { ...get(), stickerFlow: null },
          {
            kind: 'skip',
            source: state.mapNodes[state.currentNodeIndex].type === 'shop' ? 'shop' : 'reward',
            items: flow.items,
          },
        );
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
