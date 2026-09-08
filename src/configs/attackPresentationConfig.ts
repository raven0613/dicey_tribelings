export const ATTACK_EMPHASIS = {
  relativeStart: 1.5, relativePeak: 4,
  shareStart: 0.18, sharePeak: 0.5,
  minimumStrength: 0.25,
  // 主力蓄力的實際放大倍數；衝刺與命中沿用此尺寸。
  carryScale: { min: 1.5, max: 1.9 },
  windupMs: 120, extraWindupMs: 40,
  extraImpactMs: 30, extraRecoilMs: 85,
  dashStretch: 0.28, impactSquash: 0.3,
  windupOffset: 10,
  scale: { windup: 0.92, dash: 1.45, impact: 1.55 },
  rotation: { windup: -12, dash: 18, impact: 8 },
  bulge: { minimum: 0.55, windup: 1, dash: 0.7, impact: 0.4 },
  bulgeScale: 0.42,
  easing: {
    windup: 'cubic-bezier(0.333333, 0, 0.666667, 0.333333)',
    dash: 'cubic-bezier(0.1, 0.9, 0.2, 1)',
    settle: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
} as const;
