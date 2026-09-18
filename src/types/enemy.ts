import type { MonsterFeatureId } from '../configs/monsters/monsterPresentationConfig';

export type RegionId = 1 | 2 | 3 | 4 | 5 | 6;
export type EnemyRank = 'normal' | 'elite' | 'boss' | 'final_boss';

export type DamageCounter = {
  type: 'damage_taken';
  threshold: number;
  effect: 'cancel' | 'halve';
  bonusReduction?: number;
};

export interface IntentMechanics {
  hits?: number;
  guardedFollowup?: number;
  unshieldedBonus?: number;
  shieldMultiplier?: number;
  expose?: number;
  retaliate?: { bonusHits: number; damage: number };
  heal?: { amount: number; uses: number; consumeShield?: boolean; belowHp?: number };
  strength?: number;
  seal?: boolean;
  grapple?: number;
  stunOnBreak?: boolean;
  singleHitThreshold?: number;
  diverseTags?: number;
}

export interface EnemyTraits {
  hitArmor?: { layers: number; multiplier: number };
  comboVulnerability?: number;
  onHpHit?: number;
  missingHpPower?: { fraction: number; damage: number };
}
export type EnemyIntent = IntentMechanics & (
  | { type: 'attack' | 'heavy_attack'; name: string; value: number;
      counter?: DamageCounter | { type: 'shield_depleted'; effect: 'halve' } }
  | { type: 'defend'; name: string; value: number;
      counter?: DamageCounter & { effect: 'cancel' } }
  | { type: 'charge'; name: string }
  | { type: 'rest'; name: string });

export interface EnemyDefinition {
  readonly id: string;
  readonly name: string;
  readonly region: RegionId;
  readonly rank: EnemyRank;
  readonly maxHp: number;
  readonly initialShield: number;
  readonly avatar: string;
  readonly mapFeatures: readonly MonsterFeatureId[];
  readonly traits?: EnemyTraits;
  readonly phases?: readonly { below: number; intents: readonly [EnemyIntent, ...EnemyIntent[]] }[];
  readonly intents: readonly [EnemyIntent, ...EnemyIntent[]];
}

export interface Enemy {
  id: string;
  name: string;
  region: RegionId;
  maxHp: number;
  hp: number;
  shield: number;
  avatar: string;
  isElite: boolean;
  isBoss: boolean;
  intents: [EnemyIntent, ...EnemyIntent[]];
  currentIntentIndex: number;
  traits?: EnemyTraits;
  phases?: EnemyDefinition['phases'];
  phase?: number;
  armor?: number;
  strength?: number;
  exposure?: number;
  hitsTaken?: number;
  bonusHits?: number;
  roundDamage?: number;
  largestHit?: number;
  shieldBroken?: boolean;
  retaliated?: boolean;
  healsUsed?: Record<string, number>;
  sealedDie?: string;
  grapple?: { diceId: string; damage: number };
}
