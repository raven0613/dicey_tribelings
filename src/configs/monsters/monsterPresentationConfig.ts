import type { EnemyRank } from '../../types/enemy';
export const MONSTER_RANK_COLORS = { normal: '#e2e8f0', elite: '#c084fc', boss: '#fbbf24', final_boss: '#fb7185' } satisfies Record<EnemyRank, string>;
export const MONSTER_FEATURE_NAMES = {
  chargedStrike: '蓄力重擊', interruptible: '可打斷', exposed: '格擋露隙', seal: '封骰', grapple: '鉤索',
  shieldPower: '持盾強攻', hitArmor: '破甲暈眩', multihit: '密集連擊', strength: '下輪號令',
  defense: '攻守交替', phases: '雙階段變招', dual: '命中／護盾雙條件', fatigue: '先強後弱',
  contraband: '限時額外戰利品', watch: '本輪盯防', fury: '重骰蓄怒',
} as const;
export type MonsterFeatureId = keyof typeof MONSTER_FEATURE_NAMES;
