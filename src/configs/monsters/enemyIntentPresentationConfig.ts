export const ENEMY_INTENT_TEXT = {
  rest: '休息',
  command: '發出號令',
  defend: (value: number) => `獲得 ${value} 護盾`,
  attack: (value: number, hits: number) => `攻擊 ${value} × ${hits} hit`,
  charge: {
    battle: (nextDamage?: number) => nextDamage === undefined ? ['蓄力'] : ['蓄力', `下回合 ${nextDamage} 傷害`],
    sequence: (_nextDamage?: number) => ['蓄力'],
  },
} as const;
export type EnemyIntentDisplay = keyof typeof ENEMY_INTENT_TEXT.charge;
