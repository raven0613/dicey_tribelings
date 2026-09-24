export const BATTLE_LIMIT = { rounds: 50, warningRemaining: 10 } as const;
export const BATTLE_PRESENTATION = {
  pulseMs: 260, nameDelayMs: 20, nameFadeInMs: 80, nameHoldMs: 480, nameFadeOutMs: 160,
  nameRisePx: 18, nameEntryPx: 4, nameGapPx: 4, nameAnchorGapPx: 8,
  nameVerticalMargin: 8,
  eventGapMs: 110, numberDurationMs: 240, numberSoundIntervalMs: 64,
  beforeAttackMs: 80,
  heavyShake: 14, lightShake: 7,
  windupMs: 25, dashMs: 50, impactMs: 70, recoilMs: 35, betweenAttackMs: 15,
  victoryMs: 350, enemyThinkMs: 600, nextRoundMs: 600,
  enemyWindupMs: 80, enemyDashMs: 70, enemyImpactMs: 90, enemyRecoilMs: 120,
} as const;
export const COMBAT_GOLD = { normal: 15, elite: 20, boss: 15 } as const;

export const SKILL_AUDIO = {
  smallPulse: { frequency: 660, duration: 0.12, volume: 0.07 },
  largePulse: { frequency: 440, duration: 0.12, volume: 0.12 },
  roll: { frequency: 780, duration: 0.025, volume: 0.025 },
  settle: { frequency: 1046, duration: 0.06, volume: 0.045 },
} as const;

export const IMPACT_AUDIO = { noiseDurationSeconds: 0.05 } as const;
