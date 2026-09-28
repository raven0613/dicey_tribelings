import type { MonsterFeatureId } from '../configs/monsters/monsterPresentationConfig';
export type RegionId = 1 | 2 | 3;
export type EnemyRank = 'normal' | 'elite' | 'boss' | 'final_boss';
export interface DamageCounter { type: 'damage_taken'; threshold: number; effect: 'cancel' | 'halve' }
export interface IntentMechanics {
  hits?: number;
  shieldGain?: number;
  mitigation?: number;
  exposeOnBlock?: number;
  seal?: boolean;
  grapple?: { damage: number; breakDamage: number };
  command?: number;
  hitWeaken?: number;
  shieldWeaken?: number;
  shieldMultiplier?: number;
}
export type EnemyIntent = IntentMechanics & (
  | { type: 'attack' | 'heavy_attack'; name: string; value: number;
      counter?: DamageCounter | { type: 'shield_depleted'; effect: 'halve' } }
  | { type: 'defend'; name: string; value: number; counter?: DamageCounter }
  | { type: 'charge' | 'rest'; name: string; counter?: DamageCounter });
export interface EnemyTraits {
  hitArmor?: { layers: number; multiplier: number };
  fatigue?: boolean;
  watch?: { multiplier: number };
  contraband?: { deadline: number };
  rerollFury?: { threshold: number; intent: EnemyIntent };
}
export interface EnemyDefinition {
  readonly id: string; readonly name: string; readonly region: RegionId; readonly rank: EnemyRank;
  readonly maxHp: number; readonly initialShield: number; readonly avatar: string;
  readonly mapFeatures: readonly MonsterFeatureId[]; readonly traits?: EnemyTraits;
  readonly phases?: readonly { below: number; intents: readonly [EnemyIntent, ...EnemyIntent[]] }[];
  readonly intents: readonly [EnemyIntent, ...EnemyIntent[]];
}
export interface Enemy {
  id: string; definitionId: string; name: string; region: RegionId; rank: EnemyRank;
  maxHp: number; hp: number; shield: number; avatar: string;
  isElite: boolean; isBoss: boolean;
  intents: [EnemyIntent, ...EnemyIntent[]]; currentIntentIndex: number;
  traits?: EnemyTraits; phases?: EnemyDefinition['phases']; phase?: number;
  armor?: number; armorStun?: boolean; strength?: number; exposure?: number;
  hitsTaken?: number; roundDamage?: number; sealedDie?: string;
  grapple?: { diceId: string; damage: number; breakDamage: number };
  actionsTaken?: number; prizeLost?: boolean;
  fury?: number; furyPending?: boolean;
}
