import type { FaceMaterial } from './materials';
import type { AttackStage, BonusAttackDice } from './game';
import type { CreatureId, CreatureTag } from './creatures';

export interface EnemyAttackFeedback {
  stage: Exclude<AttackStage, 'idle'>;
  heavy: boolean;
  healthDamage: number;
  shieldDamage: number;
}

export interface CalculatedRollItem {
  diceId: string;
  diceName: string;
  faceId: string;
  material?: FaceMaterial;
  faceIndex: number;
  rolledCreature: CreatureId;
  rolledBaseValue: number;
  baseValue: number;
  creature: CreatureId;
  tags: CreatureTag[];
  finalDamage: number;
  bonusTags: string[];
  shieldGranted: number;
  skillInputs: SkillInputs;
}

/** Values captured at the role's own resolution step, before later skills alter the board. */
export interface SkillInputs {
  count?: number;
  minimum?: number;
  value?: number;
  before?: number;
  after?: number;
  virtualFood?: boolean;
  blockedByRobbery?: boolean;
}

export interface SkillChange {
  kind: 'attack' | 'shield' | 'food' | 'bonus';
  targetId: string;
  before: number;
  after: number;
}

export interface SkillEvent {
  skill: CreatureId | 'storage' | 'princessReady' | 'equipment' | 'material';
  activated: boolean;
  relation: 'support' | 'adjacent' | 'robbery' | 'attack';
  id: string;
  stage: number;
  sourceDiceId?: string;
  equipmentId?: string;
  sourceFaceId?: string;
  echoed?: boolean;
  ability: string;
  participantDiceIds: string[];
  changes: SkillChange[];
  identities: { diceId: string; creature: CreatureId; tags: CreatureTag[] }[];
  bonusIds: string[];
  repeatDiceIds: string[];
}

export interface RepeatAttack { diceId: string; damage: number; sourceDiceId: string }
export interface BattleContext { foodCapacity?: number;  control: number; maxControl: number; gold: number; currentEnemy?: import('./enemy').Enemy | { shield: number } | null }

export interface BattleComboSummary {
  items: CalculatedRollItem[];
  bonusDice: BonusAttackDice[];
  repeatAttacks: RepeatAttack[];
  events: SkillEvent[];
  triggeredEquipmentIds: string[];
  totalDamage: number;
  healing: number;
  reflection: number;
  nextEchoUsed: string[];
  nextGildedFaces: string[];
  totalShield: number;
  bonusControlGranted: number;
  goldGranted: number;
  nextStoredFood: Record<string, number>;
  leftoverFood: number;
}

export interface NumberDisplay {
  displayValue: number;
  scale: number;
  isSpinning: boolean;
  isLocked: boolean;
  isBuffed: boolean;
}
export interface SkillFeedback { event: SkillEvent; startedAt: number }
