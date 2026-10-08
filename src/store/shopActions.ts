import { recordDecision } from '../service/telemetry/commit';
import { SHOP_CONFIG } from '../configs/shopConfig';
import type { GameState, FlowCompletion } from './gameStore.types';
import type { ConsumableSticker, DisposableSticker, StickerItem } from '../types/game';
import { INITIAL_PLAYER_STATS } from '../configs/gameConfig';
import { INVENTORY_CONFIG } from '../configs/inventoryConfig';
import { replaceConsumable } from '../service/inventory/inventoryService';
import {
  calculateHealPurchase,
  getEquipmentOffer,
  getStickerOffer,
} from '../service/shop/shopService';
import { soundService } from '../service/audio/soundService';
export function createShopActions(
  set: (value: Partial<GameState>) => void,
  get: () => GameState,
  createConsumableInstance: (sticker: DisposableSticker) => ConsumableSticker,
  startStickerFlow: (items: StickerItem[], completion: FlowCompletion) => void,
  completeEquipmentChoice: () => void,
) {
  return {
    buyShopPack: (id) => {
      const state = get(),
        node = state.mapNodes[state.currentNodeIndex];
      if (
        node.type !== 'shop' ||
        node.completed ||
        state.stickerFlow ||
        state.openedPackResult ||
        state.pendingEquipment ||
        state.pendingShopSticker ||
        state.gold < SHOP_CONFIG.packCost ||
        !state.shopPacks.some((pack) => pack.id === id)
      )
        return false;
      set({
        gold: state.gold - SHOP_CONFIG.packCost,
        shopPacks: state.shopPacks.filter((pack) => pack.id !== id),
      });
      recordDecision(set, state, get(), {
        kind: 'purchase',
        source: 'shop',
        choiceId: id,
        items: state.shopPacks.filter((pack) => pack.id === id),
      });
      get().openPackAction(id, 'stay');
      return true;
    },
    buyShopSticker: (stickerId) => {
      const state = get();
      const offer = getStickerOffer(get().shopStickers, stickerId, get().gold);
      if (
        !offer ||
        get().stickerFlow ||
        get().openedPackResult ||
        get().pendingShopSticker ||
        get().pendingEquipment
      )
        return false;
      if (offer.item.isDisposable === false) {
        set({
          gold: get().gold - offer.cost,
          shopStickers: get().shopStickers.filter((item) => item.id !== stickerId),
        });
        startStickerFlow([offer.item], 'stay');
        recordDecision(set, state, get(), {
          kind: 'purchase',
          source: 'shop',
          choiceId: stickerId,
          items: get().stickerFlow!.items,
        });
        return true;
      }
      if (get().consumableStickers.length === INVENTORY_CONFIG.consumableCapacity) {
        set({ pendingShopSticker: { sticker: offer.item, cost: offer.cost } });
      } else {
        const incoming = createConsumableInstance(offer.item);
        set({
          gold: get().gold - offer.cost,
          consumableStickers: [...get().consumableStickers, incoming],
          shopStickers: get().shopStickers.filter((item) => item.id !== stickerId),
        });
        startStickerFlow([{ ...offer.item, ...incoming }], 'stay');
        recordDecision(set, state, get(), {
          kind: 'purchase',
          source: 'shop',
          choiceId: stickerId,
          items: get().stickerFlow!.items,
        });
        soundService.playCoin();
      }
      return true;
    },

    replaceShopSticker: (instanceId) => {
      const state = get();
      const pending = get().pendingShopSticker;
      if (!pending || !get().consumableStickers.some((item) => item.instanceId === instanceId))
        return;
      const incoming = createConsumableInstance(pending.sticker);
      set({
        temporaryPlacements: get().temporaryPlacements.filter(
          (item) => item.consumable.instanceId !== instanceId,
        ),
        gold: get().gold - pending.cost,
        consumableStickers: replaceConsumable(get().consumableStickers, instanceId, incoming),
        shopStickers: get().shopStickers.filter((item) => item.id !== pending.sticker.id),
        pendingShopSticker: null,
      });
      startStickerFlow([{ ...pending.sticker, ...incoming }], 'stay');
      recordDecision(set, state, get(), {
        kind: 'purchase',
        source: 'shop',
        choiceId: pending.sticker.id,
        items: get().stickerFlow!.items,
      });
      soundService.playCoin();
    },

    cancelShopSticker: () => set({ pendingShopSticker: null }),

    buyShopEquipment: (equipmentId) => {
      const state = get();
      const offer = getEquipmentOffer(get().shopEquipments, equipmentId, get().gold);
      if (
        !offer ||
        get().stickerFlow ||
        get().openedPackResult ||
        get().pendingShopSticker ||
        get().pendingEquipment
      )
        return false;
      if (get().equipments.length >= INITIAL_PLAYER_STATS.maxEquipmentSlots) {
        set({ pendingEquipment: { equipment: offer.item, source: 'shop', cost: offer.cost } });
        return true;
      }
      set({
        gold: get().gold - offer.cost,
        equipments: [...get().equipments, offer.item],
        shopEquipments: get().shopEquipments.filter((item) => item.id !== equipmentId),
      });
      recordDecision(set, state, get(), {
        kind: 'purchase',
        source: 'shop',
        choiceId: equipmentId,
        items: [offer.item],
      });
      soundService.playCoin();
      return true;
    },

    replacePendingEquipment: (equipmentId) => {
      const state = get();
      const pending = get().pendingEquipment;
      if (!pending) return;
      const slotIndex = get().equipments.findIndex((item) => item.id === equipmentId);
      if (slotIndex < 0) return;
      set({
        gold: get().gold - pending.cost,
        equipments: get().equipments.map((item) =>
          item.id === equipmentId ? pending.equipment : item,
        ),
        chestRewardOptions: pending.source === 'chest' ? [] : get().chestRewardOptions,
        shopEquipments:
          pending.source === 'shop'
            ? get().shopEquipments.filter((item) => item.id !== pending.equipment.id)
            : get().shopEquipments,
        equipmentSlotFeedback:
          pending.source === 'chest' ? { slotIndex } : get().equipmentSlotFeedback,
      });
      recordDecision(set, state, get(), {
        kind: pending.source === 'shop' ? 'purchase' : 'equip',
        source: pending.source,
        choiceId:
          pending.source === 'shop'
            ? pending.equipment.id
            : state.chestRewardOptions.find((item) => item.equipment.id === pending.equipment.id)
                ?.id,
        items: [pending.equipment],
      });
      soundService.playEquip();
      completeEquipmentChoice();
    },

    cancelPendingEquipment: () => set({ pendingEquipment: null }),

    buyHeal: () => {
      const state = get();
      const result = calculateHealPurchase(get().gold, get().playerHp, get().maxHp);
      if (!result) return false;
      set(result);
      recordDecision(set, state, get(), { kind: 'heal', source: 'shop', choiceId: 'heal' });
      soundService.playCoin();
      return true;
    },
  } satisfies Pick<
    GameState,
    | 'buyShopPack'
    | 'buyShopSticker'
    | 'replaceShopSticker'
    | 'cancelShopSticker'
    | 'buyShopEquipment'
    | 'replacePendingEquipment'
    | 'cancelPendingEquipment'
    | 'buyHeal'
  >;
}
