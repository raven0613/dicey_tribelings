import type { BonusAttackDice } from './game';
import type { CreatureId, CreatureTag } from './creatures';

export interface CalculatedRollItem {
  diceId: string;
  diceName: string;
  faceIndex: number;
  rolledCreature: CreatureId;
  rolledBaseValue: number;
  baseValue: number;
  creature: CreatureId;
  tags: CreatureTag[];
  finalDamage: number;
  bonusTags: string[];
  shieldGranted: number;
}

export interface SkillChange {
  kind: 'attack' | 'shield' | 'food' | 'bonus';
  targetId: string;
  before: number;
  after: number;
}

export interface SkillEvent {
  id: string;
  stage: number;
  sourceDiceId?: string;
  equipmentId?: string;
  ability: string;
  participantDiceIds: string[];
  changes: SkillChange[];
  identities: { diceId: string; creature: CreatureId; tags: CreatureTag[] }[];
  bonusIds: string[];
  repeatDiceIds: string[];
}

export interface RepeatAttack { diceId: string; damage: number; sourceDiceId: string }
export interface BattleContext { control: number; maxControl: number; gold: number; currentEnemy?: { shield: number } | null }

export interface BattleComboSummary {
  items: CalculatedRollItem[];
  bonusDice: BonusAttackDice[];
  repeatAttacks: RepeatAttack[];
  events: SkillEvent[];
  triggeredEquipmentIds: string[];
  totalDamage: number;
  totalShield: number;
  bonusControlGranted: number;
  goldGranted: number;
  nextStoredFood: Record<string, number>;
  leftoverFood: number;
  activeCombos: { title: string; description: string; bonusValue: number }[];
}

export interface NumberDisplay {
  displayValue: number;
  scale: number;
  isSpinning: boolean;
  isLocked: boolean;
  isBuffed: boolean;
}
export interface SkillFeedback { event: SkillEvent; startedAt: number }
