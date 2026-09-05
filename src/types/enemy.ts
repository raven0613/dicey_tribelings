export type RegionId = 1 | 2 | 3 | 4 | 5 | 6;
export type EnemyRank = 'normal' | 'elite' | 'boss' | 'final_boss';

export type DamageCounter = {
  type: 'damage_taken';
  threshold: number;
  effect: 'cancel' | 'halve';
};

export type EnemyIntent =
  | { type: 'attack' | 'heavy_attack'; name: string; value: number;
      counter?: DamageCounter | { type: 'shield_depleted'; effect: 'halve' } }
  | { type: 'defend'; name: string; value: number;
      counter?: DamageCounter & { effect: 'cancel' } }
  | { type: 'charge'; name: string }
  | { type: 'rest'; name: string };

export interface EnemyDefinition {
  readonly id: string;
  readonly name: string;
  readonly region: RegionId;
  readonly rank: EnemyRank;
  readonly maxHp: number;
  readonly initialShield: number;
  readonly avatar: string;
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
}
