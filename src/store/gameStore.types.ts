import type { DiceRecipe } from '../configs/creatures/diceRecipeConfig';
import type {
  CombatImpact,
  EnemyAttackFeedback,
  NumberDisplay,
  SkillFeedback,
} from '../types/battle';
import type { DiceAction } from '../service/battle/rollService';
import type { RerollStep } from '../service/battle/creatures/rerollResolution';
import type {
  WaitForAttackMotion,
  WaitForEnemyAttackMotion,
} from '../service/battle/battleSettlement';
import type { ArrowId, CreatureId, CreatureTag } from '../types/creatures';
import type { CreatureBattleState } from '../types/creatures';
import {
  AttackStage,
  BattleRewardOption,
  ChestRewardOption,
  CombatPhase,
  ConsumableSticker,
  DamagePop,
  DamagePopInput,
  Dice,
  Enemy,
  Equipment,
  MapNode,
  StickerItem,
  StickerPack,
  DisposableSticker,
  TemporaryStickerPlacement,
  OwnedSticker,
  OwnedPermanentSticker,
  StickerSort,
} from '../types/game';
import { BattleComboSummary } from '../service/battle/battleEngine';
import { PackOpenResult } from '../service/stickers/packService';

export type FlowCompletion = 'advance' | 'stay';

export interface StickerFlow {
  items: OwnedSticker[];
  index: number;
  completion: FlowCompletion;
  rewardGold?: number;
  usedAny?: boolean;
  editing?: boolean;
}

export interface PackRevealState extends Omit<PackOpenResult, 'stickers'> {
  stickers: OwnedPermanentSticker[];
  completion: FlowCompletion;
}

export interface PendingShopSticker {
  sticker: DisposableSticker;
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
  runId: string | null;
  telemetryDecision: import('../service/telemetry/decisionTypes').DecisionCommit | null;
  telemetryEnemyActions: import('../service/telemetry/decisionTypes').EnemyActionRecord[] | null;
  combatImpact: CombatImpact | null;
  playerHp: number;
  maxHp: number;
  gold: number;
  control: number;
  maxControl: number;
  playerShield: number;
  dicePool: Dice[];
  moveDice: (diceId: string, targetIndex: number) => void;
  creatureBattleState: CreatureBattleState;
  equipments: Equipment[];
  consumableStickers: ConsumableSticker[];
  permanentStickers: OwnedPermanentSticker[];
  temporaryPlacements: TemporaryStickerPlacement[];
  stickerSort: StickerSort;
  setStickerSort: (sort: StickerSort) => void;
  placeInventorySticker: (
    instanceId: string,
    diceId: string,
    faceIndex: number,
    direction?: ArrowId,
  ) => boolean;
  takeFaceSticker: (diceId: string, faceIndex: number) => boolean;
  moveFaceSticker: (
    sourceDiceId: string,
    sourceIndex: number,
    targetDiceId: string,
    targetIndex: number,
  ) => boolean;
  discardInventorySticker: (instanceId: string) => void;
  storeFlowSticker: (index: number) => boolean;
  mapNodes: MapNode[];
  currentNodeIndex: number;
  routeChoices: number[];
  chooseRoute: (nodeId: number) => void;
  enemies: Enemy[];
  selectedEnemyId: string | null;
  activeEnemyId: string | null;
  selectEnemy: (enemyId: string) => void;
  combatPhase: CombatPhase;
  rolledIndices: number[];
  comboSummary: BattleComboSummary | null;
  activeRerollingIndex: number | null;
  attackingDieIndex: number | null;
  attackingBonusIndex: number | null;
  attackingStage: AttackStage;
  attackEmphasis: number;
  enemyAttack: EnemyAttackFeedback | null;
  damagePops: DamagePop[];
  visibleBonusIds: string[];
  skillFeedback: SkillFeedback[];
  displayedIdentities: Record<string, { creature: CreatureId; tags: CreatureTag[] }>;
  displayedShields: Record<string, NumberDisplay>;
  displayedFood: Record<string, NumberDisplay>;
  playerShieldDisplay: number | null;
  playerHpDisplay: number | null;
  hoveredEquipmentId: string | null;
  setHoveredEquipment: (id: string | null) => void;
  diceAction: DiceAction;
  pendingPaidRerollDiceId: string | null;
  confirmPaidReroll: (dontShowAgain: boolean) => void;
  cancelPaidReroll: () => void;
  pendingRerolls: RerollStep[];
  rerollAnimationId: number;
  rerollAnimationMode: 'roll' | 'flip';
  storedRations: number;
  princessPackCount: number;
  princessGuaranteed: boolean;
  diceSlotStates: Record<number, NumberDisplay>;
  bonusSlotStates: Record<string, NumberDisplay>;
  soundMuted: boolean;
  selectedDiceForInspect: Dice | null;
  diceRewardOptions: DiceRecipe[];
  receivedRewardDice: Dice | null;
  acknowledgeRewardDice: () => void;
  diceRefreshes: number;
  lootRefreshes: number;
  shopRefreshes: number;
  extraReward: import('../types/game').PermanentSticker | null;
  chooseRewardDice: (recipeId: string) => void;
  refreshDiceReward: () => void;
  refreshBattleRewards: () => void;
  refreshShop: () => void;
  beginExtraReward: () => void;
  openedPackResult: PackRevealState | null;
  stickerFlow: StickerFlow | null;
  pendingShopSticker: PendingShopSticker | null;
  pendingEquipment: PendingEquipment | null;
  equipmentSlotFeedback: EquipmentSlotFeedback | null;
  battleRewardOptions: BattleRewardOption[];
  battleRewardPickCount: number;
  campBuff: import('../types/camp').CampBuffId | null;
  campOffer: import('../types/camp').CampBuffId | null;
  campRefreshes: number;
  chooseCamp: (choice: import('../types/camp').CampChoice) => void;
  refreshCamp: () => void;
  chestRewardOptions: ChestRewardOption[];
  shopStickers: StickerItem[];
  shopPacks: StickerPack[];
  buyShopPack: (id: string) => boolean;
  toggleSplit: () => void;
  chooseFlowSticker: (index: number) => void;
  returnToStickerSelection: () => void;
  discardStickerAt: (index: number) => void;
  skipStickerFlow: () => void;
  claimBattleReward: (id: string) => void;
  shopEquipments: Equipment[];
  toggleSound: () => void;
  startNode: (nodeIndex: number) => void;
  confirmBattlePreparation: (placements?: TemporaryStickerPlacement[]) => void;
  startBattleRoll: () => void;
  finishRollAnimation: () => void;
  useControlReroll: (dieIndex: number) => void;
  setDiceAction: (action: DiceAction) => void;
  finishRerollAnimation: (dieIndex: number) => void;
  executeBattleSettlement: (
    waitForAttackMotion: WaitForAttackMotion,
    waitForEnemyMotion?: WaitForEnemyAttackMotion,
  ) => Promise<void>;
  addDamagePop: (pop: DamagePopInput) => void;
  removeDamagePop: (id: number) => void;
  openPackAction: (packId: string, completion: FlowCompletion) => void;
  beginOpenedPack: () => void;
  applyCurrentSticker: (diceId: string, faceIndex: number, direction?: ArrowId) => boolean;
  skipBattleReward: () => void;
  openChest: () => void;
  claimChestReward: (option: ChestRewardOption) => void;
  skipChestReward: () => void;
  buyShopSticker: (stickerId: string) => boolean;
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
}
