type EnemyStrikeRole = 'main' | 'minion';
// 受擊
export const ENEMY_STRIKE = {
  timing: {
    windup: 140,
    dash: 45,
    impact: 85,
    recoil: 240,
  },
  roles: {
    defaultRole: 'main' as EnemyStrikeRole,
    byDefinition: {
      r1_grunt: 'minion',
      r2_blades: 'minion',
      r3_guard: 'minion',
    } as Partial<Record<string, EnemyStrikeRole>>,
    gain: {
      main: 1.06,
      minion: 0.94,
    },
  },
  strength: {
    referenceDamage: 18,
    base: 0.7,
    damageGain: 0.65,
    heavyGain: 1.1,
    min: 0.7,
    max: 1.85,
  },
  windup: {
    distance: 52,
    widen: 0.13,
    compress: 0.16,
  },
  dash: {
    overlap: 22,
    narrow: 0.12,
    stretch: 0.28,
  },
  impact: {
    widen: 0.22,
    compress: 0.22,
    rebound: 8,
    reboundStretch: 0.06,
  },
  trails: [
    { distance: 28, opacity: 0.3, stretch: 1.08 },
    { distance: 58, opacity: 0.18, stretch: 1.18 },
    { distance: 94, opacity: 0.1, stretch: 1.3 },
  ],
  speedLines: {
    color: '#fff3b0',
    opacity: 0.7,
    top: '-35%',
    lines: [
      { left: '20%', width: 5, height: 100 },
      { left: '48%', width: 8, height: 155 },
      { left: '78%', width: 4, height: 120 },
    ],
  },
} as const;
