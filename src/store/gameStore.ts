import { createStickerFlowActions } from './stickers/stickerFlowActions';
import { createInventoryActions } from './stickers/inventoryActions';
import { createOwnedSticker, initializeFaceStickers } from '../service/inventory/stickerInstances';
import { BACKPACK_PRESENTATION } from '../configs/inventoryConfig';
import { REWARD_CONFIG } from '../configs/rewardConfig';
import { getBattleRewardStickers, getSkipRewardGold } from '../service/rewards/rewardService';
import { createCampActions } from './campActions';
import { drawCampBuff } from '../service/camp/campService';
import type { CampBuffId } from '../types/camp';
import { createShopActions } from './shopActions';
import { canReorderDice, reorderDice } from '../service/dice/diceOrder';
import { DAMAGE_POP_PRESENTATION } from '../configs/numberFeedbackConfig';
import { appendDamagePop } from '../service/battle/presentation/damagePops';
import { completeRouteNode, selectRouteNode } from '../service/regions/routeService';
import { useStoryStore } from './storyStore';
import { syncStoryProgress } from '../service/story/syncStoryProgress';
import { create } from 'zustand';
import { createCreatureBattleState } from '../service/battle/creatures/creatureState';
import { ConsumableSticker, DisposableSticker } from '../types/game';
import {
  ALL_EQUIPMENT_CATALOG,
  INITIAL_DICE_POOL,
  INITIAL_EQUIPMENT,
  INITIAL_MAP_NODES,
  INITIAL_PLAYER_STATS,
} from '../configs/gameConfig';
import { openStickerPack } from '../service/stickers/packService';
import { computeMaxControl, getEnemiesForNode } from '../service/battle/nodeService';
import { generateShopStock } from '../service/shop/shopStock';
import { calculateRollResolution } from '../service/battle/battleEngine';
import { createDraftActions } from './draftActions';
import { createBattleActions } from './battleActions';
import { CREATURE_BALANCE } from '../configs/creatures/creatureBalanceConfig';
import { createPermanentSticker } from '../configs/creatures/creatureStickerConfig';
import { runBattleSettlement } from '../service/battle/battleSettlement';
import {
  applyTemporaryPlacements,
  validateTemporaryPlacements,
  createConsumableSticker,
  removeConsumables,
} from '../service/inventory/inventoryService';
import { generateChestRewardOptions } from '../service/rewards/rewardService';
import { soundService } from '../service/audio/soundService';
import { GameState } from './gameStore.types';

let consumableSequence = 0;
let damagePopSequence = 0;

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
    campBuff: null as CampBuffId | null,
    combatImpact: null,
    playerHp: INITIAL_PLAYER_STATS.hp,
    maxHp: INITIAL_PLAYER_STATS.maxHp,
    gold: INITIAL_PLAYER_STATS.gold,
    control: INITIAL_PLAYER_STATS.maxControl,
    maxControl: INITIAL_PLAYER_STATS.maxControl,
    playerShield: 0,
    dicePool: initializeFaceStickers(clone(INITIAL_DICE_POOL)),
    creatureBattleState: createCreatureBattleState(),
    equipments: clone(INITIAL_EQUIPMENT),
    consumableStickers: [] as ConsumableSticker[],
    permanentStickers: [], temporaryPlacements: [], stickerSort: BACKPACK_PRESENTATION.defaultSort,
    mapNodes: clone(INITIAL_MAP_NODES),
    currentNodeIndex: 0, routeChoices: [] as number[],
    enemies: [], selectedEnemyId: null, activeEnemyId: null,
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
    soundMuted: false,
    selectedDiceForInspect: null,
    receivedRewardDice: null, diceRewardOptions: [], diceRefreshes: 0, lootRefreshes: 0, shopRefreshes: 0, extraReward: null,
    openedPackResult: null,
    stickerFlow: null,
    pendingShopSticker: null,
    pendingEquipment: null,
    equipmentSlotFeedback: null,
    battleRewardOptions: [],
    battleRewardPickCount: 0, campOffer: null, campRefreshes: 0,
    chestRewardOptions: [],
    shopStickers: [], shopPacks: [],
    shopEquipments: [],
  };
}

export const useGameStore = create<GameState>((set, get) => {
  const { startStickerFlow, actions: stickerActions } = createStickerFlowActions(set, get);

  const completeEquipmentChoice = () => {
    const pending = get().pendingEquipment;
    if (!pending) return;
    set({ pendingEquipment: null });
    if (pending.source === 'chest') get().advanceToNextNode();
  };

  return {
    ...getInitialValues(),
    ...stickerActions,
    ...createInventoryActions(set, get),
    moveDice: (diceId, targetIndex) => {
      const state = get();
      if (!canReorderDice(state.combatPhase, state.enemies.length > 0)) return;
      const dicePool = reorderDice(state.dicePool, diceId, targetIndex);
      if (dicePool !== state.dicePool) set({ dicePool, comboSummary: null, rolledIndices: [], diceSlotStates: {} });
    },

    toggleSound: () => {
      const soundMuted = !get().soundMuted;
      soundService.isMuted = soundMuted;
      set({ soundMuted });
    },

    addDamagePop: (pop) => {
      const id = ++damagePopSequence;
      set((state) => ({ damagePops: appendDamagePop(state.damagePops, pop, id, performance.now()) }));
      setTimeout(() => get().removeDamagePop(id), DAMAGE_POP_PRESENTATION.lifetimeMs);
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
        battleRewardOptions: [], receivedRewardDice: null, diceRewardOptions: [], diceRefreshes: 0, lootRefreshes: 0, shopRefreshes: 0, extraReward: null,
        battleRewardPickCount: 0, campOffer: null, campRefreshes: 0,
        chestRewardOptions: [],
        openedPackResult: null,
        stickerFlow: null,
        pendingShopSticker: null,
        pendingEquipment: null,
      };

      if (targetNode.type === 'fight' || targetNode.type === 'elite' || targetNode.type === 'boss') {
        const maxControl = computeMaxControl(get().equipments, get().gold, get().campBuff);
        const enemies = getEnemiesForNode(targetNode);
        set({
          ...common,
          enemies, selectedEnemyId: enemies[0].id, activeEnemyId: null,
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
        set({ ...common, enemies: [], selectedEnemyId: null, activeEnemyId: null, combatPhase: 'CONTROL_PHASE', ...stock });
        return;
      }

      set({ ...common, enemies: [], selectedEnemyId: null, activeEnemyId: null, combatPhase: 'CONTROL_PHASE',
        campOffer: targetNode.type === 'camp' ? drawCampBuff() : null });
    },

    confirmBattlePreparation: (placements = get().temporaryPlacements) => {
      if (get().combatPhase !== 'PREPARATION' || get().stickerFlow || get().openedPackResult) return;
      if (!validateTemporaryPlacements(get().dicePool, get().consumableStickers, placements)) return;
      const ownedPlacements = placements.map((placement) => ({ ...placement,
        consumable: get().consumableStickers.find((item) => item.instanceId === placement.consumable.instanceId)! }));

      set({
        dicePool: applyTemporaryPlacements(get().dicePool, ownedPlacements),
        temporaryPlacements: [],
        consumableStickers: removeConsumables(
          get().consumableStickers,
          placements.map((item) => item.consumable.instanceId)
        ),
      });
      get().startBattleRoll();
    },

    setHoveredEquipment: (hoveredEquipmentId) => set({ hoveredEquipmentId }),
    ...createBattleActions(set, get),
    ...createDraftActions(set, get),
    ...createCampActions(set, get),
    selectEnemy: (enemyId) => {
      const state = get();
      if (!['PREPARATION', 'ROLLING', 'CONTROL_PHASE'].includes(state.combatPhase)
        || !state.enemies.some(enemy => enemy.id === enemyId && enemy.hp > 0)) return;
      set({ selectedEnemyId: enemyId, comboSummary: state.comboSummary
        ? calculateRollResolution(state.dicePool, state.rolledIndices, state.equipments, state.creatureBattleState, { ...state, selectedEnemyId: enemyId }) : null });
    },
    beginExtraReward: () => {
      const reward = get().extraReward;
      if (!reward || get().receivedRewardDice || get().diceRewardOptions.length) return;
      set({ extraReward: null });
      startStickerFlow([reward], 'stay');
    },

    executeBattleSettlement: async (waitForAttackMotion, waitForEnemyMotion) => {
      await runBattleSettlement({ get, set,
        startBattleRoll: get().startBattleRoll, addDamagePop: get().addDamagePop, waitForAttackMotion, waitForEnemyMotion });
    },

    openPackAction: (packId, completion) => {
      const result = openStickerPack(packId, Math.random, get().princessPackCount);
      set({ princessPackCount: get().princessPackCount + result.stickers.filter((item) => item.creature === 'princess').length });
      soundService.playVictory();
      set({ openedPackResult: { ...result, stickers: result.stickers.map(createOwnedSticker), completion } });
    },

    beginOpenedPack: () => {
      const result = get().openedPackResult;
      if (!result) return;
      set({ openedPackResult: null });
      startStickerFlow(result.stickers, result.completion);
    },

    claimBattleReward: (id) => {
      const state = get(), option = state.battleRewardOptions.find(item => item.id === id);
      if (!option || state.combatPhase !== 'VICTORY' || state.receivedRewardDice || state.diceRewardOptions.length || state.extraReward || state.stickerFlow || !state.battleRewardPickCount) return;
      const items = getBattleRewardStickers(option);
      set({ battleRewardOptions: [], battleRewardPickCount: 0,
        princessPackCount: state.princessPackCount + items.filter(item => item.creature === 'princess').length,
        stickerFlow: { items: items.map(createOwnedSticker), index: -1, completion: 'advance', rewardGold: getSkipRewardGold(state.enemies[0].rank), usedAny: false } });
      soundService.playVictory();
    },
    skipBattleReward: () => {
      const state = get();
      if (state.combatPhase !== 'VICTORY' || !state.battleRewardOptions.length || state.receivedRewardDice || state.diceRewardOptions.length || state.extraReward || state.stickerFlow || !state.battleRewardPickCount) return;
      set({ battleRewardOptions: [], battleRewardPickCount: 0, gold: state.gold + getSkipRewardGold(state.enemies[0].rank) });
      get().advanceToNextNode();
    },

    openChest: () => {
      const ownedIds = new Set(get().equipments.map((equipment) => equipment.id));
      const equipmentPool = ALL_EQUIPMENT_CATALOG.filter((equipment) => !ownedIds.has(equipment.id));
      set({ chestRewardOptions: generateChestRewardOptions(equipmentPool) });
      soundService.playCoin();
    },

    claimChestReward: (option) => {
      if (!get().chestRewardOptions.some(item => item.id === option.id)) return;
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
      set({ chestRewardOptions: [], pendingEquipment: null, gold: get().gold + REWARD_CONFIG.skipGold.equipment });
      get().advanceToNextNode();
    },

    ...createShopActions(set, get, createConsumableInstance, startStickerFlow, completeEquipmentChoice),

    advanceToNextNode: () => {
      const { currentNodeIndex, mapNodes } = get();
      if (mapNodes[currentNodeIndex].completed || get().routeChoices.length || get().receivedRewardDice || get().diceRewardOptions.length
        || get().extraReward || get().stickerFlow || get().openedPackResult || get().battleRewardPickCount > 0) return;
      if (currentNodeIndex === CREATURE_BALANCE.princess.guaranteedNode && !get().princessGuaranteed) {
        set({ princessGuaranteed: true });
        startStickerFlow([createPermanentSticker('princess')], 'advance');
        return;
      }
      const nextNodes = completeRouteNode(mapNodes, mapNodes[currentNodeIndex].id);
      const choices = mapNodes[currentNodeIndex].next;
      set({ mapNodes: nextNodes });
      if (choices.length === 1) {
        const nodes = selectRouteNode(nextNodes, choices, choices[0])!;
        set({ mapNodes: nodes });
        get().startNode(nodes.findIndex((node) => node.id === choices[0]));
      } else if (choices.length > 1) set({ routeChoices: choices, enemies: [], selectedEnemyId: null, activeEnemyId: null,
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
  };
});

useGameStore.subscribe(syncStoryProgress);
