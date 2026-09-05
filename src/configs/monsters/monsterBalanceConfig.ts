import type { EnemyRank, RegionId } from '../../types/enemy';

/**
 * 首版校準假設：單位為整池結算傷害／玩家回合，已包含預期組合增益。
 * 僅供測試，怪物實戰數值固定於 monsterConfig.ts。
 * 第一區對照現有開局骰池；其餘區域等待正式骰池、裝備與獎勵曲線驗證。
 */
export const MONSTER_BALANCE_CONFIG = {
  regions: {
    1: { damagePerTurn: 12 },
    2: { damagePerTurn: 26 },
    3: { damagePerTurn: 50 },
    4: { damagePerTurn: 75 },
    5: { damagePerTurn: 105 },
    6: { damagePerTurn: 125 },
  } satisfies Record<RegionId, { damagePerTurn: number }>,
  turnTargets: {
    normal: [2, 3], elite: [3, 4], boss: [4, 5], final_boss: [5, 6],
  } satisfies Record<EnemyRank, readonly [number, number]>,
  scenarios: { weak: 0.7, typical: 1, strong: 1.4 },
  weakExtraTurns: 2,
  rollRange: [0.7, 1.3] as const,
  seed: 20260905,
  runsPerScenario: 512,
  maxTurns: 40,
} as const;
