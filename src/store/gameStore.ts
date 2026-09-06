import { create } from 'zustand';
import { createCreatureBattleState } from '../service/battle/creatures/creatureState';
import { ConsumableSticker, Dice, StickerItem, TemporaryStickerPlacement } from '../types/game';
import {
  ALL_EQUIPMENT_CATALOG,
  INITIAL_DICE_POOL,
  INITIAL_EQUIPMENT,
  INITIAL_MAP_NODES,
  INITIAL_PLAYER_STATS,
} from '../configs/gameConfig';
import { REWARD_CONFIG } from '../configs/rewardConfig';
import { INVENTORY_CONFIG } from '../configs/inventoryConfig';
import { STICKER_PACKS_CATALOG } from '../configs/stickerPacksConfig';
import { checkProgressionDiceReward, openStickerPack } from '../service/stickers/packService';
import { computeMaxControl, generateShopStock, getEnemyForNode } from '../service/battle/nodeService';
import { createBattleActions } from './battleActions';
import { CREATURE_BALANCE } from '../configs/creatures/creatureBalanceConfig';
import { ALL_STICKERS_CATALOG } from '../configs/creatures/creatureStickerConfig';
import { runBattleSettlement } from '../service/battle/battleSettlement';
import {
  applyPermanentSticker,
  applyTemporaryPlacements,
  createConsumableSticker,
  removeConsumables,
  replaceConsumable,
} from '../service/inventory/inventoryService';
import { generateChestRewardOptions } from '../service/rewards/rewardService';
import { calculateHealPurchase, getEquipmentOffer, getStickerOffer } from '../service/shop/shopService';
import { soundService } from '../service/audio/soundService';
import { FlowCompletion, GameState } from './gameStore.types';

let consumableSequence = 0;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function createConsumableInstance(sticker: StickerItem): ConsumableSticker {
  consumableSequence += 1;
  return createConsumableSticker(sticker, `consumable-${Date.now()}-${consumableSequence}`);
}

function getInitialValues() {
  return {
    playerHp: INITIAL_PLAYER_STATS.hp,
    maxHp: INITIAL_PLAYER_STATS.maxHp,
    gold: INITIAL_PLAYER_STATS.gold,
    control: INITIAL_PLAYER_STATS.maxControl,
    maxControl: INITIAL_PLAYER_STATS.maxControl,
    playerShield: 0,
    dicePool: clone(INITIAL_DICE_POOL),
    creatureBattleState: createCreatureBattleState(),
    equipments: clone(INITIAL_EQUIPMENT),
    consumableStickers: [] as ConsumableSticker[],
    mapNodes: clone(INITIAL_MAP_NODES),
    currentNodeIndex: 0,
    currentEnemy: null,
    combatPhase: 'PREPARATION' as const,
    rolledIndices: [] as number[],
    comboSummary: null,
    activeRerollingIndex: null,
    attackingDieIndex: null,
    attackingBonusIndex: null,
    attackingStage: 'idle' as const,
    damagePops: [],
    visibleBonusIds: [],
    skillFeedback: [], displayedIdentities: {}, displayedShields: {}, displayedFood: {}, playerShieldDisplay: null,
    diceAction: 'reroll' as const, pendingRerolls: [], rerollAnimationId: 0,
    storedRations: 0, princessPackCount: 0, princessGuaranteed: false,
    diceSlotStates: {},
    bonusSlotStates: {},
    screenShakeIntensity: 0,
    soundMuted: false,
    selectedDiceForInspect: null,
    unlockedDiceNotification: null,
    openedPackResult: null,
    stickerFlow: null,
    pendingShopSticker: null,
    pendingEquipment: null,
    equipmentSlotFeedback: null,
    battleRewardOptions: [],
    chestRewardOptions: [],
    shopStickers: [],
    shopEquipments: [],
  };
}

export const useGameStore = create<GameState>((set, get) => {
  const completeFlow = (completion: FlowCompletion) => {
    set({ stickerFlow: null });
    if (completion === 'advance') get().advanceToNextNode();
  };

  const moveStickerFlowForward = () => {
    const flow = get().stickerFlow;
    if (!flow) return;
    const nextIndex = flow.index + 1;
    if (nextIndex >= flow.items.length) {
      completeFlow(flow.completion);
      return;
    }
    set({ stickerFlow: { ...flow, index: nextIndex } });
  };

  const startStickerFlow = (items: StickerItem[], completion: FlowCompletion) => {
    if (items.length === 0) {
      if (completion === 'advance') get().advanceToNextNode();
      return;
    }
    set({ stickerFlow: { items, index: 0, completion } });
  };

  const completeEquipmentChoice = () => {
    const pending = get().pendingEquipment;
    if (!pending) return;
    set({ pendingEquipment: null });
    if (pending.source === 'chest') get().advanceToNextNode();
  };

  return {
    ...getInitialValues(),

    toggleSound: () => {
      const soundMuted = !get().soundMuted;
      soundService.isMuted = soundMuted;
      set({ soundMuted });
    },

    triggerScreenShake: (intensity = 8) => {
      set({ screenShakeIntensity: intensity });
      setTimeout(() => set({ screenShakeIntensity: 0 }), 280);
    },

    addDamagePop: (pop) => {
      const id = Date.now() + Math.random();
      set((state) => ({
        damagePops: [...state.damagePops.slice(-6), { ...pop, id, xOffset: (Math.random() - 0.5) * 44 }],
      }));
      setTimeout(() => get().removeDamagePop(id), 850);
    },

    removeDamagePop: (id) => set((state) => ({
      damagePops: state.damagePops.filter((pop) => pop.id !== id),
    })),

    startNode: (nodeIndex) => {
      const targetNode = get().mapNodes[nodeIndex];
      if (!targetNode) return;

      const common = {
        currentNodeIndex: nodeIndex,
        battleRewardOptions: [],
        chestRewardOptions: [],
        openedPackResult: null,
        stickerFlow: null,
        pendingShopSticker: null,
        pendingEquipment: null,
      };

      if (targetNode.type === 'fight' || targetNode.type === 'elite' || targetNode.type === 'boss') {
        const maxControl = computeMaxControl(get().equipments, get().gold);
        set({
          ...common,
          currentEnemy: clone(getEnemyForNode(targetNode, nodeIndex)),
          control: maxControl,
          maxControl,
          playerShield: 0,
          creatureBattleState: createCreatureBattleState(),
          combatPhase: 'PREPARATION',
          rolledIndices: [],
          skillFeedback: [], displayedIdentities: {}, displayedShields: {}, displayedFood: {}, playerShieldDisplay: null,
          pendingRerolls: [], diceAction: 'reroll', activeRerollingIndex: null,
          comboSummary: null,
          damagePops: [],
          attackingDieIndex: null,
          attackingBonusIndex: null,
          attackingStage: 'idle',
          visibleBonusIds: [],
          diceSlotStates: {},
          bonusSlotStates: {},
        });
        return;
      }

      if (targetNode.type === 'shop') {
        const stock = generateShopStock(get().equipments);
        set({ ...common, currentEnemy: null, combatPhase: 'CONTROL_PHASE', ...stock });
        return;
      }

      set({ ...common, currentEnemy: null, combatPhase: 'CONTROL_PHASE' });
    },

    confirmBattlePreparation: (placements: TemporaryStickerPlacement[]) => {
      if (get().combatPhase !== 'PREPARATION') return;
      const distinctFaces = new Set(placements.map((item) => `${item.diceId}:${item.faceIndex}`));
      const ownedIds = new Set(get().consumableStickers.map((item) => item.instanceId));
      const valid = distinctFaces.size === placements.length
        && placements.every((item) => ownedIds.has(item.consumable.instanceId));
      if (!valid) return;

      set({
        dicePool: applyTemporaryPlacements(get().dicePool, placements),
        consumableStickers: removeConsumables(
          get().consumableStickers,
          placements.map((item) => item.consumable.instanceId)
        ),
      });
      get().startBattleRoll();
    },

    ...createBattleActions(set, get),

    executeBattleSettlement: async () => {
      await runBattleSettlement({ get, set, triggerScreenShake: get().triggerScreenShake,
        startBattleRoll: get().startBattleRoll, addDamagePop: get().addDamagePop });
    },

    openPackAction: (packId, completion) => {
      const result = openStickerPack(packId, Math.random, get().princessPackCount);
      set({ princessPackCount: get().princessPackCount + result.stickers.filter((item) => item.creature === 'princess').length });
      soundService.playVictory();
      set({ openedPackResult: { ...result, completion } });
    },

    beginOpenedPack: () => {
      const result = get().openedPackResult;
      if (!result) return;
      set({ openedPackResult: null });
      startStickerFlow(result.stickers, result.completion);
    },

    applyCurrentPermanentSticker: (diceId, faceIndex) => {
      const flow = get().stickerFlow;
      const sticker = flow?.items[flow.index];
      if (!flow || !sticker || sticker.isDisposable) return;
      soundService.playStickerApply();
      set({ dicePool: applyPermanentSticker(get().dicePool, diceId, faceIndex, sticker) });
      moveStickerFlowForward();
    },

    storeCurrentConsumable: () => {
      const flow = get().stickerFlow;
      const sticker = flow?.items[flow.index];
      if (!flow || !sticker?.isDisposable || get().consumableStickers.length >= INVENTORY_CONFIG.consumableCapacity) return;
      set({ consumableStickers: [...get().consumableStickers, createConsumableInstance(sticker)] });
      soundService.playCoin();
      moveStickerFlowForward();
    },

    replaceCurrentConsumable: (instanceId) => {
      const flow = get().stickerFlow;
      const sticker = flow?.items[flow.index];
      if (!flow || !sticker?.isDisposable) return;
      set({
        consumableStickers: replaceConsumable(
          get().consumableStickers,
          instanceId,
          createConsumableInstance(sticker)
        ),
      });
      soundService.playCoin();
      moveStickerFlowForward();
    },

    discardCurrentSticker: () => moveStickerFlowForward(),

    selectBattleReward: (option) => {
      set({ battleRewardOptions: [] });
      if (option.kind === 'stickerPack') get().openPackAction(option.pack.id, 'advance');
      else startStickerFlow([option.sticker], 'advance');
    },

    skipBattleReward: () => {
      set({ battleRewardOptions: [] });
      get().advanceToNextNode();
    },

    openChest: () => {
      const ownedIds = new Set(get().equipments.map((equipment) => equipment.id));
      const equipmentPool = ALL_EQUIPMENT_CATALOG.filter((equipment) => !ownedIds.has(equipment.id));
      set({ chestRewardOptions: generateChestRewardOptions(equipmentPool, STICKER_PACKS_CATALOG) });
      soundService.playCoin();
    },

    claimChestReward: (option) => {
      if (option.kind === 'stickerPack') {
        set({ chestRewardOptions: [], gold: get().gold + REWARD_CONFIG.chestGold });
        soundService.playVictory();
        get().openPackAction(option.pack.id, 'advance');
        return;
      }
      if (get().equipments.length < INITIAL_PLAYER_STATS.maxEquipmentSlots) {
        const slotIndex = get().equipments.length;
        set({
          chestRewardOptions: [],
          gold: get().gold + REWARD_CONFIG.chestGold,
          equipments: [...get().equipments, option.equipment],
          equipmentSlotFeedback: { slotIndex },
        });
        soundService.playVictory();
        soundService.playEquip();
        get().advanceToNextNode();
        return;
      }
      set({ pendingEquipment: { equipment: option.equipment, source: 'chest', cost: 0 } });
    },

    buyShopSticker: (stickerId) => {
      const offer = getStickerOffer(get().shopStickers, stickerId, get().gold);
      if (!offer) return false;
      set({ pendingShopSticker: { sticker: offer.item, cost: offer.cost } });
      return true;
    },

    confirmShopSticker: () => {
      const pending = get().pendingShopSticker;
      if (!pending || get().consumableStickers.length >= INVENTORY_CONFIG.consumableCapacity) return;
      set({
        gold: get().gold - pending.cost,
        consumableStickers: [...get().consumableStickers, createConsumableInstance(pending.sticker)],
        shopStickers: get().shopStickers.filter((item) => item.id !== pending.sticker.id),
        pendingShopSticker: null,
      });
      soundService.playCoin();
    },

    replaceShopSticker: (instanceId) => {
      const pending = get().pendingShopSticker;
      if (!pending) return;
      set({
        gold: get().gold - pending.cost,
        consumableStickers: replaceConsumable(
          get().consumableStickers,
          instanceId,
          createConsumableInstance(pending.sticker)
        ),
        shopStickers: get().shopStickers.filter((item) => item.id !== pending.sticker.id),
        pendingShopSticker: null,
      });
      soundService.playCoin();
    },

    cancelShopSticker: () => set({ pendingShopSticker: null }),

    buyShopEquipment: (equipmentId) => {
      const offer = getEquipmentOffer(get().shopEquipments, equipmentId, get().gold);
      if (!offer) return false;
      if (get().equipments.length >= INITIAL_PLAYER_STATS.maxEquipmentSlots) {
        set({ pendingEquipment: { equipment: offer.item, source: 'shop', cost: offer.cost } });
        return true;
      }
      set({
        gold: get().gold - offer.cost,
        equipments: [...get().equipments, offer.item],
        shopEquipments: get().shopEquipments.filter((item) => item.id !== equipmentId),
      });
      soundService.playCoin();
      return true;
    },

    replacePendingEquipment: (equipmentId) => {
      const pending = get().pendingEquipment;
      if (!pending) return;
      const slotIndex = get().equipments.findIndex((item) => item.id === equipmentId);
      if (slotIndex < 0) return;
      set({
        gold: get().gold - pending.cost
          + (pending.source === 'chest' ? REWARD_CONFIG.chestGold : 0),
        equipments: get().equipments.map((item) => item.id === equipmentId ? pending.equipment : item),
        chestRewardOptions: pending.source === 'chest' ? [] : get().chestRewardOptions,
        shopEquipments: pending.source === 'shop'
          ? get().shopEquipments.filter((item) => item.id !== pending.equipment.id)
          : get().shopEquipments,
        equipmentSlotFeedback: pending.source === 'chest'
          ? { slotIndex }
          : get().equipmentSlotFeedback,
      });
      soundService.playEquip();
      completeEquipmentChoice();
    },

    cancelPendingEquipment: () => set({ pendingEquipment: null }),

    buyHeal: () => {
      const result = calculateHealPurchase(get().gold, get().playerHp, get().maxHp);
      if (!result) return false;
      set(result);
      soundService.playCoin();
      return true;
    },

    advanceToNextNode: () => {
      const { currentNodeIndex, dicePool, mapNodes } = get();
      if (currentNodeIndex === CREATURE_BALANCE.princess.guaranteedNode && !get().princessGuaranteed) {
        set({ princessGuaranteed: true });
        startStickerFlow([ALL_STICKERS_CATALOG.find((item) => item.creature === 'princess')!], 'advance');
        return;
      }
      const rewardDie = checkProgressionDiceReward(currentNodeIndex, dicePool);
      const nextDicePool: Dice[] = rewardDie ? [...dicePool, rewardDie] : dicePool;
      const nextIndex = currentNodeIndex + 1;
      const nextNodes = mapNodes.map((node, index) => ({
        ...node,
        completed: index === currentNodeIndex ? true : node.completed,
        current: index === nextIndex,
      }));

      set({ dicePool: nextDicePool, mapNodes: nextNodes, unlockedDiceNotification: rewardDie });
      if (rewardDie) soundService.playVictory();
      if (nextIndex < nextNodes.length) get().startNode(nextIndex);
      else set({ combatPhase: 'VICTORY' });
    },

    restartGame: () => {
      consumableSequence = 0;
      set(getInitialValues());
      get().startNode(0);
    },

    openDiceInspect: (dice) => set({ selectedDiceForInspect: dice }),
    closeDiceInspect: () => set({ selectedDiceForInspect: null }),
    dismissDiceNotification: () => set({ unlockedDiceNotification: null }),
  };
});
