import { create } from 'zustand';
import {
  Dice,
  Equipment,
  StickerItem,
  Enemy,
  MapNode,
  CombatPhase,
  TemporarySticker,
  DamagePop,
  AttackStage,
} from '../types/game';
import {
  INITIAL_PLAYER_STATS,
  INITIAL_DICE_POOL,
  INITIAL_EQUIPMENT,
  INITIAL_MAP_NODES,
  INITIAL_ENEMIES,
  ALL_STICKERS_CATALOG,
  ALL_EQUIPMENT_CATALOG,
} from '../configs/gameConfig';
import {
  processOpenPack,
  checkProgressionDiceReward,
  PackOpenResult,
} from '../service/stickers/packService';
import { handleBuyShopItem } from '../service/shop/shopService';
import {
  computeMaxControl,
  getEnemyForNode,
  generateShopStock,
} from '../service/battle/nodeService';
import { BattleComboSummary } from '../service/battle/battleEngine';
import { performStartBattleRoll, performControlReroll } from '../service/battle/rollService';
import { runBattleSettlement } from '../service/battle/battleSettlement';
import { soundService } from '../service/audio/soundService';

interface GameState {
  playerHp: number;
  maxHp: number;
  gold: number;
  control: number;
  maxControl: number;
  playerShield: number;

  dicePool: Dice[];
  equipments: Equipment[];
  stickers: StickerItem[];

  mapNodes: MapNode[];
  currentNodeIndex: number;
  currentEnemy: Enemy | null;
  combatPhase: CombatPhase;

  // Dice battle state
  rolledIndices: number[];
  comboSummary: BattleComboSummary | null;
  activeRerollingIndex: number | null; // index of die currently being re-rolled
  attackingDieIndex: number | null;
  attackingBonusIndex: number | null;
  attackingStage: AttackStage;
  damagePops: DamagePop[];
  showBonusDice: boolean;
  diceSlotStates: Record<number, { displayValue: number; isSpinning: boolean; isLocked: boolean; isBuffed: boolean }>;
  bonusSlotStates: Record<string, { displayValue: number; isSpinning: boolean; isLocked: boolean }>;

  // UI / VFX flags
  screenShakeIntensity: number;
  soundMuted: boolean;
  selectedDiceForInspect: Dice | null;
  stickerToApply: StickerItem | null;

  // Consumable Stickers (max 3, active for whole battle)
  consumableStickers: StickerItem[];

  // Progression & Pack Unwrapping Modals
  unlockedDiceNotification: Dice | null;
  openedPackResult: PackOpenResult | null;

  // Reward / Shop states
  rewardStickerOptions: StickerItem[];
  victoryRewardClaimed: boolean;
  shopStickers: StickerItem[];
  shopEquipments: Equipment[];
  shopDice: Dice[];

  // Actions
  toggleSound: () => void;
  triggerScreenShake: (intensity?: number) => void;
  startNode: (nodeIndex: number) => void;
  startBattleRoll: () => void;
  finishRollPhysics: () => void;
  useControlReroll: (dieIndex: number) => void;
  finishRerollPhysics: (dieIndex: number) => void;
  executeBattleSettlement: (onStepProgress?: (step: number) => void) => Promise<void>;
  addDamagePop: (pop: Omit<DamagePop, 'id'>) => void;
  removeDamagePop: (id: number) => void;
  applyStickerToFace: (diceId: string, faceIndex: number, sticker: StickerItem) => void;
  removeTemporarySticker: (diceId: string, faceIndex: number) => void;
  addEquipment: (equipment: Equipment) => boolean;
  removeEquipment: (equipmentId: string) => void;
  addDiceToPool: (dice: Dice) => void;
  addConsumableSticker: (sticker: StickerItem) => boolean;
  useConsumableSticker: (sticker: StickerItem) => void;
  discardConsumableSticker: (stickerId: string) => void;
  openPackAction: (packId: string) => void;
  closeOpenedPackModal: () => void;
  dismissDiceNotification: () => void;
  selectStickerReward: (sticker: StickerItem) => void;
  claimChestReward: (chosenEquip?: Equipment) => void;
  buyShopItem: (type: 'sticker' | 'equipment' | 'dice' | 'heal', id: string) => boolean;
  advanceToNextNode: () => void;
  restartGame: () => void;
  openDiceInspect: (dice: Dice) => void;
  closeDiceInspect: () => void;
  setStickerToApply: (sticker: StickerItem | null) => void;
}

function getInitialValues() {
  return {
    playerHp: INITIAL_PLAYER_STATS.hp,
    maxHp: INITIAL_PLAYER_STATS.maxHp,
    gold: INITIAL_PLAYER_STATS.gold,
    control: INITIAL_PLAYER_STATS.maxControl,
    maxControl: INITIAL_PLAYER_STATS.maxControl,
    playerShield: 0,
    dicePool: JSON.parse(JSON.stringify(INITIAL_DICE_POOL)) as Dice[],
    equipments: JSON.parse(JSON.stringify(INITIAL_EQUIPMENT)) as Equipment[],
    stickers: [] as StickerItem[],
    consumableStickers: [] as StickerItem[],
    unlockedDiceNotification: null as Dice | null,
    openedPackResult: null as PackOpenResult | null,
    mapNodes: JSON.parse(JSON.stringify(INITIAL_MAP_NODES)),
    currentNodeIndex: 0,
    currentEnemy: null,
    combatPhase: 'ROLLING' as CombatPhase,
    rolledIndices: [] as number[],
    comboSummary: null,
    activeRerollingIndex: null,
    attackingDieIndex: null,
    attackingBonusIndex: null,
    attackingStage: 'idle' as AttackStage,
    damagePops: [] as DamagePop[],
    showBonusDice: false,
    diceSlotStates: {},
    bonusSlotStates: {},
    screenShakeIntensity: 0,
    soundMuted: false,
    selectedDiceForInspect: null,
    stickerToApply: null,
    rewardStickerOptions: [] as StickerItem[],
    victoryRewardClaimed: false,
    shopStickers: [] as StickerItem[],
    shopEquipments: [] as Equipment[],
    shopDice: [] as Dice[],
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  ...getInitialValues(),

  toggleSound: () => {
    const nextMuted = !get().soundMuted;
    soundService.isMuted = nextMuted;
    set({ soundMuted: nextMuted });
  },

  triggerScreenShake: (intensity = 8) => {
    set({ screenShakeIntensity: intensity });
    setTimeout(() => {
      set({ screenShakeIntensity: 0 });
    }, 280);
  },

  addDamagePop: (pop) => {
    const id = Date.now() + Math.random();
    set((state) => ({
      damagePops: [...state.damagePops.slice(-6), { ...pop, id, xOffset: (Math.random() - 0.5) * 44 }],
    }));
    setTimeout(() => {
      get().removeDamagePop(id);
    }, 850);
  },

  removeDamagePop: (id) => {
    set((state) => ({
      damagePops: state.damagePops.filter((p) => p.id !== id),
    }));
  },

  startNode: (nodeIndex: number) => {
    const nodes = get().mapNodes;
    const targetNode = nodes[nodeIndex];
    if (!targetNode) return;

    const totalMaxControl = computeMaxControl(get().equipments);

    if (targetNode.type === 'fight' || targetNode.type === 'elite' || targetNode.type === 'boss') {
      const enemyTemplate = getEnemyForNode(targetNode, nodeIndex);

      set({
        currentNodeIndex: nodeIndex,
        currentEnemy: JSON.parse(JSON.stringify(enemyTemplate)),
        control: totalMaxControl,
        maxControl: totalMaxControl,
        playerShield: 0,
        combatPhase: 'ROLLING',
        rewardStickerOptions: [],
        victoryRewardClaimed: false,
        damagePops: [],
        attackingDieIndex: null,
        attackingBonusIndex: null,
        attackingStage: 'idle',
        showBonusDice: false,
        diceSlotStates: {},
        bonusSlotStates: {},
      });

      get().startBattleRoll();
    } else if (targetNode.type === 'shop') {
      const { shopStickers, shopEquipments } = generateShopStock(get().equipments);
      set({
        currentNodeIndex: nodeIndex,
        currentEnemy: null,
        combatPhase: 'CONTROL_PHASE',
        rewardStickerOptions: [],
        stickerToApply: null,
        shopStickers,
        shopEquipments,
        shopDice: [],
      });
    } else if (targetNode.type === 'chest') {
      set({ currentNodeIndex: nodeIndex, currentEnemy: null, combatPhase: 'CONTROL_PHASE', rewardStickerOptions: [], stickerToApply: null });
    }
  },

  startBattleRoll: () => {
    const { rolledIndices, comboSummary, combatPhase } = performStartBattleRoll(get().dicePool, get().equipments);
    set({
      rolledIndices,
      comboSummary,
      combatPhase,
      activeRerollingIndex: null,
      attackingDieIndex: null,
      attackingBonusIndex: null,
      attackingStage: 'idle',
      showBonusDice: false,
      diceSlotStates: {},
      bonusSlotStates: {},
    });
  },

  finishRollPhysics: () => {
    if (get().combatPhase === 'ROLLING') {
      set({ combatPhase: 'CONTROL_PHASE' });
    }
  },

  useControlReroll: (dieIndex: number) => {
    const { control, dicePool, rolledIndices, equipments, combatPhase } = get();
    const res = performControlReroll(dieIndex, { control, dicePool, rolledIndices, equipments, combatPhase });
    if (!res.success) return;

    set({
      control: res.newControl!,
      rolledIndices: res.newRolledIndices!,
      comboSummary: res.newSummary!,
      activeRerollingIndex: dieIndex,
      showBonusDice: false,
      diceSlotStates: {},
      bonusSlotStates: {},
    });
  },

  finishRerollPhysics: (dieIndex: number) => {
    if (get().activeRerollingIndex === dieIndex) {
      set({ activeRerollingIndex: null });
    }
  },

  executeBattleSettlement: async (onStepProgress?: (step: number) => void) => {
    await runBattleSettlement(
      {
        get,
        set,
        triggerScreenShake: get().triggerScreenShake,
        startBattleRoll: get().startBattleRoll,
        addDamagePop: get().addDamagePop,
      },
      onStepProgress
    );
  },

  applyStickerToFace: (diceId: string, faceIndex: number, sticker: StickerItem) => {
    soundService.playStickerApply();
    const updated = get().dicePool.map((die) => {
      if (die.id !== diceId) return die;
      const newFaces = [...die.faces];
      const oldFace = newFaces[faceIndex];
      if (!oldFace) return die;

      if (sticker.isDisposable) {
        // Apply temporary sticker on top of current face (lasts whole battle!)
        const temp: TemporarySticker = {
          name: sticker.name,
          baseValue: sticker.baseValue,
          element: sticker.element,
          special: sticker.special,
          description: sticker.description,
        };
        newFaces[faceIndex] = { ...oldFace, temporarySticker: temp };
      } else {
        // Permanently overwrite base face
        newFaces[faceIndex] = {
          ...oldFace,
          baseValue: sticker.baseValue,
          element: sticker.element,
          special: sticker.special,
          temporarySticker: null,
        };
      }
      return { ...die, faces: newFaces };
    });

    // If it was applied from consumables, consume it from consumableStickers!
    const newConsumables = get().consumableStickers.filter((s) => s.id !== sticker.id);

    set({ dicePool: updated, stickerToApply: null, consumableStickers: newConsumables });
  },

  removeTemporarySticker: (diceId: string, faceIndex: number) => {
    const updated = get().dicePool.map((die) => {
      if (die.id !== diceId) return die;
      const newFaces = [...die.faces];
      if (newFaces[faceIndex]) {
        newFaces[faceIndex] = { ...newFaces[faceIndex], temporarySticker: null };
      }
      return { ...die, faces: newFaces };
    });
    set({ dicePool: updated });
  },

  addConsumableSticker: (sticker: StickerItem) => {
    const { consumableStickers } = get();
    if (consumableStickers.length >= 3) return false;
    soundService.playCoin();
    set({ consumableStickers: [...consumableStickers, sticker] });
    return true;
  },

  useConsumableSticker: (sticker: StickerItem) => {
    set({ stickerToApply: sticker });
  },

  discardConsumableSticker: (stickerId: string) => {
    set({ consumableStickers: get().consumableStickers.filter((s) => s.id !== stickerId) });
  },

  openPackAction: (packId: string) => {
    soundService.playVictory();
    const { consumableStickers } = get();
    const { result, updatedConsumables } = processOpenPack(packId, consumableStickers, 3);
    set({
      openedPackResult: result,
      consumableStickers: updatedConsumables,
    });
  },

  closeOpenedPackModal: () => {
    set({ openedPackResult: null });
    // If was in chest or victory, can advance
    if (get().mapNodes[get().currentNodeIndex]?.type === 'chest') {
      get().advanceToNextNode();
    }
  },

  dismissDiceNotification: () => {
    set({ unlockedDiceNotification: null });
  },

  addEquipment: (equipment: Equipment) => {
    const { equipments } = get();
    if (equipments.length >= INITIAL_PLAYER_STATS.maxEquipmentSlots) return false;
    soundService.playCoin();
    set({ equipments: [...equipments, equipment] });
    return true;
  },

  removeEquipment: (equipmentId: string) => {
    set({ equipments: get().equipments.filter((e) => e.id !== equipmentId) });
  },

  addDiceToPool: (dice: Dice) => {
    soundService.playCoin();
    set({ dicePool: [...get().dicePool, dice] });
  },

  selectStickerReward: (sticker: StickerItem) => {
    if (sticker.isPack) {
      get().openPackAction(sticker.packId || 'pack_elemental');
      set({ rewardStickerOptions: [], victoryRewardClaimed: true });
      return;
    }

    if (sticker.isDisposable) {
      get().addConsumableSticker(sticker);
      set({ rewardStickerOptions: [], victoryRewardClaimed: true });
      get().advanceToNextNode();
      return;
    }

    // Permanent sticker
    set({
      stickerToApply: sticker,
      rewardStickerOptions: [],
      victoryRewardClaimed: true,
    });
  },

  claimChestReward: (chosenEquip?: Equipment) => {
    soundService.playVictory();
    if (chosenEquip) {
      get().addEquipment(chosenEquip);
    } else {
      const avail = ALL_EQUIPMENT_CATALOG.filter((eq) => !get().equipments.some((e) => e.id === eq.id));
      if (avail.length > 0) get().addEquipment(avail[0]);
    }
    set({ gold: get().gold + 25 });
    get().advanceToNextNode();
  },

  buyShopItem: (type, id) => {
    const { gold, playerHp, maxHp, equipments, shopEquipments, shopStickers } = get();
    const res = handleBuyShopItem(type, id, { gold, playerHp, maxHp, equipments, shopEquipments, shopStickers });
    if (!res.success) return false;

    soundService.playCoin();
    const partial: Partial<GameState> = {};
    if (res.newGold !== undefined) partial.gold = res.newGold;
    if (res.newPlayerHp !== undefined) partial.playerHp = res.newPlayerHp;
    if (res.newEquipments) partial.equipments = res.newEquipments;
    if (res.newShopEquipments) partial.shopEquipments = res.newShopEquipments;
    if (res.newShopStickers) partial.shopStickers = res.newShopStickers;

    if (res.purchasedSticker) {
      if (res.purchasedSticker.isDisposable) {
        get().addConsumableSticker(res.purchasedSticker);
      } else {
        partial.stickerToApply = res.purchasedSticker;
      }
    }

    set(partial);
    return true;
  },

  advanceToNextNode: () => {
    const { mapNodes, currentNodeIndex, dicePool } = get();

    // Check level progression dice reward!
    const rewardDie = checkProgressionDiceReward(currentNodeIndex, dicePool);
    let nextDicePool = [...dicePool];
    if (rewardDie) {
      nextDicePool.push(rewardDie);
      set({ unlockedDiceNotification: rewardDie });
      soundService.playVictory();
    }

    // Reset any temporary battle stickers for next stage
    nextDicePool = nextDicePool.map((die) => ({
      ...die,
      faces: die.faces.map((f) => ({ ...f, temporarySticker: null })),
    }));

    const updatedNodes = mapNodes.map((n, idx) => {
      if (idx === currentNodeIndex) return { ...n, completed: true, current: false };
      if (idx === currentNodeIndex + 1) return { ...n, current: true };
      return n;
    });

    const nextIdx = currentNodeIndex + 1;
    set({
      dicePool: nextDicePool,
      rewardStickerOptions: [],
      stickerToApply: null,
      victoryRewardClaimed: true,
    });

    if (nextIdx < updatedNodes.length) {
      set({ mapNodes: updatedNodes });
      get().startNode(nextIdx);
    } else {
      set({ combatPhase: 'VICTORY' });
    }
  },

  restartGame: () => {
    set(getInitialValues());
    get().startNode(0);
  },

  openDiceInspect: (dice: Dice) => set({ selectedDiceForInspect: dice }),
  closeDiceInspect: () => set({ selectedDiceForInspect: null }),
  setStickerToApply: (sticker: StickerItem | null) => set({ stickerToApply: sticker }),
}));
