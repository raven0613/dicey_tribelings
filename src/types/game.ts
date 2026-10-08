import type { RegionId } from './enemy';
import type { FaceMaterial } from './materials';
import type { ArrowId, CreatureId, PermanentCreatureId } from './creatures';


export interface TemporarySticker {
  name: string;
  creature: CreatureId;
  description: string;
}

export interface DiceFace {
  stickerIdentity?: StickerInstanceIdentity;
  material?: FaceMaterial;
  materialDecay?: number;
  id: string;
  baseValue: number;
  creature: CreatureId;
  temporarySticker?: TemporarySticker;
}

export interface Dice {
  recipeId?: string;
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

export interface BonusAttackDice {
  id: string;
  source: { kind: 'creature'; diceId: string; faceId?: string; ability: string } | { kind: 'equipment'; equipmentId: string };
  sourceName: string;
  creature?: CreatureId;
  bonusDamage: number;
  originalDamage?: number;
  absorbed?: boolean;
  label: string;
  description: string;
}

export type StickerCreatureId = PermanentCreatureId | 'directional';

interface StickerIdentity {
  id: string;
  name: string;
  creature: StickerCreatureId;
  description: string;
  rarity: EquipmentRarity;
  cost?: number;
}
export interface PermanentSticker extends StickerIdentity {
  creature: PermanentCreatureId;
  isDisposable: false;
  material?: FaceMaterial;
}
export interface DisposableSticker extends StickerIdentity {
  isDisposable: true;
}
export type StickerItem = PermanentSticker | DisposableSticker;
/** A directional inventory item becomes a concrete arrow only during face preview/application. */
export type FaceSticker = PermanentSticker | (Omit<DisposableSticker, 'creature'> & { creature: CreatureId });

export interface StickerInstanceIdentity {
  instanceId: string;
  acquiredAt: number;
  acquisitionOrder: number;
}

export type OwnedPermanentSticker = PermanentSticker & StickerInstanceIdentity;
export type OwnedSticker = StickerItem & StickerInstanceIdentity;
export type StickerSort = 'name' | 'time';

export interface ConsumableSticker extends StickerInstanceIdentity {
  stickerId: string;
  name: string;
  creature: StickerCreatureId;
  description: string;
  rarity: EquipmentRarity;
}

export interface StickerPack {
  id: string;
  name: string;
  rarity: EquipmentRarity;
  description: string;
  stickerCount: number;
  permanentCount: number;
  themeName: string;
  creatures: readonly PermanentCreatureId[];
  slots: readonly (readonly PermanentCreatureId[])[];
}

export interface StickerBundleReward {
  id: string;
  kind: 'bundle';
  sticker: PermanentSticker;
  hidden: PermanentSticker[];
}

export interface StickerPackReward {
  id: string;
  kind: 'pack';
  pack: StickerPack;
  stickers: PermanentSticker[];
}

export type BattleRewardOption = StickerBundleReward | StickerPackReward;

export type ChestRewardOption = { id: string; kind: 'equipment'; equipment: Equipment };

export interface TemporaryStickerPlacement {
  consumable: ConsumableSticker;
  diceId: string;
  faceIndex: number;
  direction?: ArrowId;
}

export type { Enemy, EnemyIntent } from './enemy';

export type MapNodeType = 'fight' | 'chest' | 'shop' | 'elite' | 'boss' | 'camp';

export interface MapNode {
  next: number[];
  skipped?: boolean;
  route?: 'safe' | 'challenge' | 'camp' | 'combat';
  id: number;
  region: RegionId;
  regionNode: number;
  type: MapNodeType;
  enemyIds?: string[];
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
}

export type CombatPhase =
  | 'PREPARATION'
  | 'ROLLING'
  | 'CONTROL_PHASE'
  | 'RESOLVING_CALCULATION'
  | 'RESOLVING_ATTACK'
  | 'ENEMY_TURN'
  | 'VICTORY'
  | 'DEFEAT';

export type AttackStage = 'idle' | 'windup' | 'dash' | 'impact' | 'recoil';

export interface DamagePopInput {
  enemyId?: string;
  value: number;
  creature?: CreatureId;
}

export interface DamagePop extends DamagePopInput {
  id: number;
  startedAt: number;
}
