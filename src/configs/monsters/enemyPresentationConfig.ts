// 受擊
export const ENEMY_PRESENTATION = {
  memberWidth: 760,
  spriteWidth: 500,
  vitalsGap: 12,
  intentGap: 24,
  formationHeadroom: 88,
  hit: {
    durationMs: 170,
    flashColor: '#fff8e0',
    flashMs: 120,
    flashOpacity: 1,
    reducedFlashOpacity: 0.25,
    shift: 2,
    lift: 11,
    tilt: 0.3,
    compression: 0.015,
    shake: [
      { offset: 0.08, gain: 1 },
      { offset: 0.24, gain: -0.8 },
      { offset: 0.4, gain: 0.55 },
      { offset: 0.56, gain: -0.32 },
      { offset: 0.72, gain: 0.15 },
      { offset: 1, gain: 0 },
    ],
  },
} as const;
