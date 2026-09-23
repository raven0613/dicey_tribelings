import type { EnemyAttackFeedback, NumberDisplay, SkillFeedback } from '../types/battle';
import type { DiceAction } from '../service/battle/rollService';
import type { RerollStep } from '../service/battle/creatures/rerollResolution';
import type { WaitForAttackMotion } from '../service/battle/battleSettlement';
import type { CreatureId, CreatureTag } from '../types/creatures';
import type { CreatureBattleState } from '../types/creatures';
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
  DisposableSticker,
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
  mapNodes: MapNode[];
  currentNodeIndex: number;
  routeChoices: number[];
  chooseRoute: (nodeId: number) => void;
  currentEnemy: Enemy | null;
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
  storedRations: number;
  princessPackCount: number;
  princessGuaranteed: boolean;
  diceSlotStates: Record<number, NumberDisplay>;
  bonusSlotStates: Record<string, NumberDisplay>;
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
  battleRewardPickCount: number;
  battleRecovery: number;
  chestRewardOptions: ChestRewardOption[];
  shopStickers: StickerItem[];
  shopEquipments: Equipment[];
  toggleSound: () => void;
  triggerScreenShake: (intensity?: number) => void;
  startNode: (nodeIndex: number) => void;
  confirmBattlePreparation: (placements: TemporaryStickerPlacement[]) => void;
  startBattleRoll: () => void;
  finishRollAnimation: () => void;
  useControlReroll: (dieIndex: number) => void;
  setDiceAction: (action: DiceAction) => void;
  finishRerollAnimation: (dieIndex: number) => void;
  executeBattleSettlement: (waitForAttackMotion: WaitForAttackMotion) => Promise<void>;
  addDamagePop: (pop: Omit<DamagePop, 'id'>) => void;
  removeDamagePop: (id: number) => void;
  openPackAction: (packId: string, completion: FlowCompletion) => void;
  beginOpenedPack: () => void;
  applyCurrentPermanentSticker: (diceId: string, faceIndex: number) => void;
  replaceCurrentConsumable: (instanceId: string) => void;
  discardCurrentSticker: () => void;
  applyBattleRewardSticker: (optionId: string, diceId: string, faceIndex: number) => void;
  claimBattleRewardPack: (optionId: string) => void;
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
  dismissDiceNotification: () => void;
}
