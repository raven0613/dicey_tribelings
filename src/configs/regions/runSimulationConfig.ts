/** 可重現的首版決策模型；此處只配置模擬策略，遊戲數值讀取正式 config。 */
export const RUN_SIMULATION_CONFIG = {
  seed: 20260907, runs: 24, maxBattleTurns: 40,
  evaluationSamples: 12, candidateFaces: 6, rerollSamples: 12,
  shieldScore: 0.8, healthLossWeight: 2, rerollGain: 1, healBelow: 40,
} as const;
