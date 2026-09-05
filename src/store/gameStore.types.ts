import {
  AttackStage,
  BattleRewardOption,
  ChestRewardOption,
  CombatPhase,
  ConsumableSticker,
  DamagePop,
  Dice,
  Enemy,
  Equipment,
  MapNode,
  StickerItem,
  TemporaryStickerPlacement,
} from '../types/game';
import { BattleComboSummary } from '../service/battle/battleEngine';
import { PackOpenResult } from '../service/stickers/packService';

export type FlowCompletion = 'advance' | 'stay';

export interface StickerFlow {
  items: StickerItem[];
  index: number;
  completion: FlowCompletion;
}

export interface PackRevealState extends PackOpenResult {
  completion: FlowCompletion;
}

export interface PendingShopSticker {
  sticker: StickerItem;
  cost: number;
}

export interface PendingEquipment {
  equipment: Equipment;
  source: 'chest' | 'shop';
  cost: number;
}

export interface EquipmentSlotFeedback {
  slotIndex: number;
}

export interface GameState {
  playerHp: number;
  maxHp: number;
  gold: number;
  control: number;
  maxControl: number;
  playerShield: number;
  dicePool: Dice[];
  equipments: Equipment[];
  consumableStickers: ConsumableSticker[];
  mapNodes: MapNode[];
  currentNodeIndex: number;
  currentEnemy: Enemy | null;
  combatPhase: CombatPhase;
  rolledIndices: number[];
  comboSummary: BattleComboSummary | null;
  activeRerollingIndex: number | null;
  attackingDieIndex: number | null;
  attackingBonusIndex: number | null;
  attackingStage: AttackStage;
  damagePops: DamagePop[];
  showBonusDice: boolean;
  diceSlotStates: Record<number, { displayValue: number; isSpinning: boolean; isLocked: boolean; isBuffed: boolean }>;
  bonusSlotStates: Record<string, { displayValue: number; isSpinning: boolean; isLocked: boolean }>;
  screenShakeIntensity: number;
  soundMuted: boolean;
  selectedDiceForInspect: Dice | null;
  unlockedDiceNotification: Dice | null;
  openedPackResult: PackRevealState | null;
  stickerFlow: StickerFlow | null;
  pendingShopSticker: PendingShopSticker | null;
  pendingEquipment: PendingEquipment | null;
  equipmentSlotFeedback: EquipmentSlotFeedback | null;
  battleRewardOptions: BattleRewardOption[];
  chestRewardOptions: ChestRewardOption[];
  shopStickers: StickerItem[];
  shopEquipments: Equipment[];
  toggleSound: () => void;
  triggerScreenShake: (intensity?: number) => void;
  startNode: (nodeIndex: number) => void;
  confirmBattlePreparation: (placements: TemporaryStickerPlacement[]) => void;
  startBattleRoll: () => void;
  finishRollPhysics: () => void;
  useControlReroll: (dieIndex: number) => void;
  finishRerollPhysics: (dieIndex: number) => void;
  executeBattleSettlement: (onStepProgress?: (step: number) => void) => Promise<void>;
  addDamagePop: (pop: Omit<DamagePop, 'id'>) => void;
  removeDamagePop: (id: number) => void;
  openPackAction: (packId: string, completion: FlowCompletion) => void;
  beginOpenedPack: () => void;
  applyCurrentPermanentSticker: (diceId: string, faceIndex: number) => void;
  storeCurrentConsumable: () => void;
  replaceCurrentConsumable: (instanceId: string) => void;
  discardCurrentSticker: () => void;
  selectBattleReward: (option: BattleRewardOption) => void;
  skipBattleReward: () => void;
  openChest: () => void;
  claimChestReward: (option: ChestRewardOption) => void;
  buyShopSticker: (stickerId: string) => boolean;
  confirmShopSticker: () => void;
  replaceShopSticker: (instanceId: string) => void;
  cancelShopSticker: () => void;
  buyShopEquipment: (equipmentId: string) => boolean;
  replacePendingEquipment: (equipmentId: string) => void;
  cancelPendingEquipment: () => void;
  buyHeal: () => boolean;
  advanceToNextNode: () => void;
  restartGame: () => void;
  openDiceInspect: (dice: Dice) => void;
  closeDiceInspect: () => void;
  dismissDiceNotification: () => void;
}
