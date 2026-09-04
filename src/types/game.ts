export type ElementType = 'normal' | 'fire' | 'wind' | 'thunder' | 'ice';

export type SpecialEffect = 'none' | 'echo' | 'chain' | 'wild' | 'crit' | 'shield';

export interface TemporarySticker {
  name: string;
  baseValue: number;
  element: ElementType;
  special?: SpecialEffect;
  description: string;
}

export interface DiceFace {
  id: string;
  baseValue: number;
  element: ElementType;
  special?: SpecialEffect;
  // If present, this temporary sticker overrides the face until used
  temporarySticker?: TemporarySticker | null;
}

export interface Dice {
  id: string;
  name: string;
  dieType: 'd6' | 'd4' | 'd8' | 'd10' | 'd12';
  colorTheme: string; // e.g. 'ruby', 'sapphire', 'emerald', 'amber', 'obsidian', 'gold'
  faces: DiceFace[];
}

export type EquipmentRarity = 'common' | 'rare' | 'legendary';

export interface Equipment {
  id: string;
  name: string;
  type: 'global' | 'control' | 'pattern';
  rarity: EquipmentRarity;
  description: string;
  iconName: string;
  // Evaluation trigger function key or rule identifier
  ruleId: string;
  value?: number;
}

export interface BonusEquipmentDice {
  id: string;
  sourceEquipmentId: string;
  sourceEquipmentName: string;
  element: ElementType;
  bonusDamage: number;
  label: string;
  description: string;
}

export interface StickerItem {
  id: string;
  name: string;
  isDisposable: boolean; // true = 1-time disposable, false = permanent
  baseValue: number;
  element: ElementType;
  special?: SpecialEffect;
  description: string;
  rarity: EquipmentRarity;
  cost?: number;
  isPack?: boolean;
  packId?: string;
}

export interface StickerPack {
  id: string;
  name: string;
  rarity: EquipmentRarity;
  description: string;
  stickerCount: number;
  themeName: string;
}

export interface EnemyIntent {
  type: 'attack' | 'defend' | 'buff' | 'heavy_attack';
  value: number;
  description: string;
}

export interface Enemy {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  shield: number;
  avatar: string;
  isElite?: boolean;
  isBoss?: boolean;
  attackPower: number;
  intents: EnemyIntent[];
  currentIntentIndex: number;
}

export type MapNodeType = 'fight' | 'chest' | 'shop' | 'elite' | 'boss';

export interface MapNode {
  id: number;
  type: MapNodeType;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
}

export interface ActiveRollState {
  diceId: string;
  faceIndex: number; // 0 to 5 for d6
  resolvedFace: {
    baseValue: number;
    element: ElementType;
    special: SpecialEffect;
    isTemporary: boolean;
  };
  // Animation coordinates & fake physics parameters
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  targetRotX: number;
  targetRotY: number;
  targetRotZ: number;
  isRolling: boolean;
  // Calculation details during settlement
  calculatedValue: number;
  bonusDetails: string[];
  isDisposableBurned?: boolean;
}

export type CombatPhase =
  | 'ROLLING'
  | 'CONTROL_PHASE'
  | 'RESOLVING_CALCULATION'
  | 'RESOLVING_ATTACK'
  | 'ENEMY_TURN'
  | 'VICTORY'
  | 'DEFEAT';

export type AttackStage = 'idle' | 'windup' | 'dash' | 'impact' | 'recoil';

export interface DamagePop {
  id: number;
  value: number;
  element: ElementType;
  isCrit?: boolean;
  isShield?: boolean;
  label?: string;
  xOffset?: number;
}
