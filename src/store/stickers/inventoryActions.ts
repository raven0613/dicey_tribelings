import type { GameState } from '../gameStore.types';
import {
  canEditStickers,
  placePermanent,
  takePermanent,
  transferFaceSticker,
} from '../../service/inventory/backpack';
import { validateTemporaryPlacements } from '../../service/inventory/inventoryService';
import { soundService } from '../../service/audio/soundService';

export function createInventoryActions(
  set: (patch: Partial<GameState>) => void,
  get: () => GameState,
) {
  return {
    setStickerSort: (stickerSort) => set({ stickerSort }),
    moveFaceSticker: (sourceDiceId, sourceIndex, targetDiceId, targetIndex) => {
      const state = get();
      if (!canEditStickers(state.combatPhase, state.enemies.length > 0)) return false;
      const result = transferFaceSticker(
        state.dicePool,
        state.temporaryPlacements,
        sourceDiceId,
        sourceIndex,
        targetDiceId,
        targetIndex,
      );
      if (
        !result ||
        !validateTemporaryPlacements(
          result.dicePool,
          state.consumableStickers,
          result.temporaryPlacements,
        )
      )
        return false;
      set(result);
      soundService.playStickerApply();
      return true;
    },
    placeInventorySticker: (instanceId, diceId, faceIndex, direction) => {
      const state = get();
      if (!canEditStickers(state.combatPhase, state.enemies.length > 0)) return false;
      const permanent = state.permanentStickers.find((item) => item.instanceId === instanceId);
      const remaining = state.temporaryPlacements.filter(
        (item) => !(item.diceId === diceId && item.faceIndex === faceIndex),
      );
      if (permanent) {
        const result = placePermanent(
          state.dicePool,
          state.permanentStickers,
          permanent,
          diceId,
          faceIndex,
        );
        if (!result) return false;
        set({ ...result, temporaryPlacements: remaining });
      } else {
        const consumable = state.consumableStickers.find((item) => item.instanceId === instanceId);
        if (!consumable) return false;
        const placements = [
          ...remaining.filter((item) => item.consumable.instanceId !== instanceId),
          {
            consumable,
            diceId,
            faceIndex,
            ...(consumable.creature === 'directional' ? { direction } : {}),
          },
        ];
        if (!validateTemporaryPlacements(state.dicePool, state.consumableStickers, placements))
          return false;
        set({ temporaryPlacements: placements });
      }
      soundService.playStickerApply();
      return true;
    },
    takeFaceSticker: (diceId, faceIndex) => {
      const state = get();
      if (!canEditStickers(state.combatPhase, state.enemies.length > 0)) return false;
      const temporaryPlacements = state.temporaryPlacements.filter(
        (item) => !(item.diceId === diceId && item.faceIndex === faceIndex),
      );
      if (temporaryPlacements.length !== state.temporaryPlacements.length) {
        set({ temporaryPlacements });
        return true;
      }
      const result = takePermanent(state.dicePool, state.permanentStickers, diceId, faceIndex);
      if (!result) return false;
      set(result);
      return true;
    },
    discardInventorySticker: (instanceId) => {
      const state = get();
      if (!canEditStickers(state.combatPhase, state.enemies.length > 0)) return;
      set({
        permanentStickers: state.permanentStickers.filter((item) => item.instanceId !== instanceId),
        consumableStickers: state.consumableStickers.filter(
          (item) => item.instanceId !== instanceId,
        ),
        temporaryPlacements: state.temporaryPlacements.filter(
          (item) => item.consumable.instanceId !== instanceId,
        ),
      });
    },
  } satisfies Pick<
    GameState,
    | 'setStickerSort'
    | 'moveFaceSticker'
    | 'placeInventorySticker'
    | 'takeFaceSticker'
    | 'discardInventorySticker'
  >;
}
