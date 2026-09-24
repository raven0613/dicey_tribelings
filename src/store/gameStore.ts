import { canReorderDice, reorderDice } from '../service/dice/diceOrder';
import { completeRouteNode, selectRouteNode } from '../service/regions/routeService';
import { useStoryStore } from './storyStore';
import { syncStoryProgress } from '../service/story/syncStoryProgress';
import { create } from 'zustand';
import { createCreatureBattleState } from '../service/battle/creatures/creatureState';
import { ConsumableSticker, Dice, DisposableSticker, StickerItem, TemporaryStickerPlacement } from '../types/game';
import {
  ALL_EQUIPMENT_CATALOG,
  INITIAL_DICE_POOL,
  INITIAL_EQUIPMENT,
  INITIAL_MAP_NODES,
  INITIAL_PLAYER_STATS,
} from '../configs/gameConfig';
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
  validateTemporaryPlacements,
  createConsumableSticker,
  removeConsumables,
  replaceConsumable,
} from '../service/inventory/inventoryService';
import { generateChestRewardOptions } from '../service/rewards/rewardService';
import { calculateHealPurchase, getEquipmentOffer, getStickerOffer } from '../service/shop/shopService';
import { soundService } from '../service/audio/soundService';
import { FlowCompletion, GameState, StickerFlow } from './gameStore.types';

let consumableSequence = 0;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function createConsumableInstance(sticker: DisposableSticker): ConsumableSticker {
  consumableSequence += 1;
  return createConsumableSticker(sticker, `consumable-${Date.now()}-${consumableSequence}`);
}

function getInitialValues() {
  return {
    runId: null as string | null,
    combatImpact: null,
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
    currentNodeIndex: 0, routeChoices: [] as number[],
    currentEnemy: null,
    combatPhase: 'PREPARATION' as const,
    rolledIndices: [] as number[],
    comboSummary: null,
    activeRerollingIndex: null,
    attackingDieIndex: null,
    attackingBonusIndex: null,
    attackingStage: 'idle' as const,
    attackEmphasis: 0,
    enemyAttack: null,
    damagePops: [],
    visibleBonusIds: [],
    skillFeedback: [], displayedIdentities: {}, displayedShields: {}, displayedFood: {}, playerShieldDisplay: null, playerHpDisplay: null,
    hoveredEquipmentId: null,
    pendingPaidRerollDiceId: null,
    diceAction: 'reroll' as const, pendingRerolls: [], rerollAnimationId: 0, rerollAnimationMode: 'roll' as const,
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
    battleRewardPickCount: 0, battleRecovery: 0,
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

  const processStickerFlow = (flow: StickerFlow) => {
    let index = flow.index;
    const inventory = [...get().consumableStickers];
    while (index < flow.items.length && inventory.length < INVENTORY_CONFIG.consumableCapacity) {
      const sticker = flow.items[index];
      if (!sticker.isDisposable) break;
      inventory.push(createConsumableInstance(sticker));
      index++;
    }
    set({ consumableStickers: inventory });
    if (index === flow.items.length) completeFlow(flow.completion);
    else set({ stickerFlow: { ...flow, index } });
  };
  const moveStickerFlowForward = () => {
    const flow = get().stickerFlow;
    if (flow) processStickerFlow({ ...flow, index: flow.index + 1 });
  };
  const startStickerFlow = (items: StickerItem[], completion: FlowCompletion) =>
    processStickerFlow({ items, index: 0, completion });

  const completeEquipmentChoice = () => {
    const pending = get().pendingEquipment;
    if (!pending) return;
    set({ pendingEquipment: null });
    if (pending.source === 'chest') get().advanceToNextNode();
  };

  return {
    ...getInitialValues(),
    moveDice: (diceId, targetIndex) => {
      const state = get();
      if (!canReorderDice(state.combatPhase, state.currentEnemy !== null)) return;
      const dicePool = reorderDice(state.dicePool, diceId, targetIndex);
      if (dicePool !== state.dicePool) set({ dicePool, comboSummary: null, rolledIndices: [], diceSlotStates: {} });
    },

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
        enemyAttack: null, combatImpact: null, hoveredEquipmentId: null, pendingPaidRerollDiceId: null,
        currentNodeIndex: nodeIndex, routeChoices: [],
        battleRewardOptions: [],
        battleRewardPickCount: 0, battleRecovery: 0,
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
          skillFeedback: [], displayedIdentities: {}, displayedShields: {}, displayedFood: {}, playerShieldDisplay: null, playerHpDisplay: null,
          pendingRerolls: [], diceAction: 'reroll', activeRerollingIndex: null,
          comboSummary: null,
          damagePops: [],
          attackingDieIndex: null,
          attackingBonusIndex: null,
          attackingStage: 'idle',
          attackEmphasis: 0,
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
      if (targetNode.type === 'pack') get().openPackAction(targetNode.packId!, 'advance');
    },

    confirmBattlePreparation: (placements: TemporaryStickerPlacement[]) => {
      if (get().combatPhase !== 'PREPARATION') return;
      if (!validateTemporaryPlacements(get().dicePool, get().consumableStickers, placements)) return;
      const ownedPlacements = placements.map((placement) => ({ ...placement,
        consumable: get().consumableStickers.find((item) => item.instanceId === placement.consumable.instanceId)! }));

      set({
        dicePool: applyTemporaryPlacements(get().dicePool, ownedPlacements),
        consumableStickers: removeConsumables(
          get().consumableStickers,
          placements.map((item) => item.consumable.instanceId)
        ),
      });
      get().startBattleRoll();
    },

    setHoveredEquipment: (hoveredEquipmentId) => set({ hoveredEquipmentId }),
    ...createBattleActions(set, get),

    executeBattleSettlement: async (waitForAttackMotion) => {
      await runBattleSettlement({ get, set, triggerScreenShake: get().triggerScreenShake,
        startBattleRoll: get().startBattleRoll, addDamagePop: get().addDamagePop, waitForAttackMotion });
    },

    openPackAction: (packId, completion) => {
      const result = openStickerPack(packId, get().mapNodes[get().currentNodeIndex].region, Math.random, get().princessPackCount);
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
      if (!flow || !sticker || sticker.isDisposable === true) return;
      soundService.playStickerApply();
      set({ dicePool: applyPermanentSticker(get().dicePool, diceId, faceIndex, sticker) });
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

    applyBattleRewardSticker: (optionId, diceId, faceIndex) => {
      const state = get();
      const option = state.battleRewardOptions.find((item) => item.id === optionId);
      if (state.combatPhase !== 'VICTORY' || state.battleRewardPickCount <= 0 || option?.kind !== 'sticker'
        || !state.dicePool.find((die) => die.id === diceId)?.faces[faceIndex]) return;
      const remaining = state.battleRewardPickCount - 1;
      set({
        dicePool: applyPermanentSticker(state.dicePool, diceId, faceIndex, option.sticker),
        battleRewardOptions: remaining > 0 ? state.battleRewardOptions.filter((item) => item.id !== optionId) : [],
        battleRewardPickCount: remaining,
      });
      soundService.playStickerApply();
      if (remaining === 0) get().advanceToNextNode();
    },

    claimBattleRewardPack: (optionId) => {
      const state = get();
      const option = state.battleRewardOptions.find((item) => item.id === optionId);
      if (state.combatPhase !== 'VICTORY' || state.battleRewardPickCount !== 1 || option?.kind !== 'stickerPack') return;
      set({ battleRewardOptions: [], battleRewardPickCount: 0 });
      get().openPackAction(option.pack.id, 'advance');
    },

    skipBattleReward: () => {
      set({ battleRewardOptions: [], battleRewardPickCount: 0 });
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
        set({ chestRewardOptions: [] });
        soundService.playVictory();
        get().openPackAction(option.pack.id, 'advance');
        return;
      }
      if (get().equipments.length < INITIAL_PLAYER_STATS.maxEquipmentSlots) {
        const slotIndex = get().equipments.length;
        set({
          chestRewardOptions: [],
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

    skipChestReward: () => {
      const { mapNodes, currentNodeIndex, chestRewardOptions } = get();
      const node = mapNodes[currentNodeIndex];
      if (node?.type !== 'chest' || node.completed || chestRewardOptions.length === 0) return;
      set({ chestRewardOptions: [], pendingEquipment: null });
      get().advanceToNextNode();
    },

    buyShopSticker: (stickerId) => {
      const offer = getStickerOffer(get().shopStickers, stickerId, get().gold);
      if (!offer || !offer.item.isDisposable) return false;
      if (get().consumableStickers.length === INVENTORY_CONFIG.consumableCapacity) {
        set({ pendingShopSticker: { sticker: offer.item, cost: offer.cost } });
      } else {
        set({ gold: get().gold - offer.cost,
          consumableStickers: [...get().consumableStickers, createConsumableInstance(offer.item)],
          shopStickers: get().shopStickers.filter((item) => item.id !== stickerId) });
        soundService.playCoin();
      }
      return true;
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
        gold: get().gold - pending.cost,
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
      if (mapNodes[currentNodeIndex].completed || get().routeChoices.length) return;
      if (currentNodeIndex === CREATURE_BALANCE.princess.guaranteedNode && !get().princessGuaranteed) {
        set({ princessGuaranteed: true });
        startStickerFlow([ALL_STICKERS_CATALOG.find((item) => item.creature === 'princess')!], 'advance');
        return;
      }
      const rewardDie = checkProgressionDiceReward(currentNodeIndex, dicePool);
      const nextDicePool: Dice[] = rewardDie ? [...dicePool, rewardDie] : dicePool;
      const nextNodes = completeRouteNode(mapNodes, mapNodes[currentNodeIndex].id);
      const choices = mapNodes[currentNodeIndex].next;
      set({ dicePool: nextDicePool, mapNodes: nextNodes, unlockedDiceNotification: rewardDie });
      if (rewardDie) soundService.playVictory();
      if (choices.length === 1) {
        const nodes = selectRouteNode(nextNodes, choices, choices[0])!;
        set({ mapNodes: nodes });
        get().startNode(nodes.findIndex((node) => node.id === choices[0]));
      } else if (choices.length > 1) set({ routeChoices: choices, currentEnemy: null,
        combatPhase: 'CONTROL_PHASE', comboSummary: null });
      else set({ combatPhase: 'VICTORY' });
    },

    chooseRoute: (nodeId) => {
      const { mapNodes, routeChoices } = get();
      const nodes = selectRouteNode(mapNodes, routeChoices, nodeId);
      if (!nodes) return;
      set({ mapNodes: nodes, routeChoices: [] });
      get().startNode(nodes.findIndex((node) => node.id === nodeId));
    },

    restartGame: () => {
      useStoryStore.getState().beginRun();
      consumableSequence = 0;
      set({ ...getInitialValues(), runId: crypto.randomUUID() });
      get().startNode(0);
    },

    openDiceInspect: (dice) => set({ selectedDiceForInspect: dice }),
    closeDiceInspect: () => set({ selectedDiceForInspect: null }),
    dismissDiceNotification: () => set({ unlockedDiceNotification: null }),
  };
});

useGameStore.subscribe(syncStoryProgress);
