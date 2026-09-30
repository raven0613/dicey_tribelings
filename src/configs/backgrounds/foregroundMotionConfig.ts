import type { SpringConfig } from '../../types/foregroundMotion';

export const FOREGROUND_MOTION = {
  stepSeconds: 1 / 120,
  maxFrameSeconds: 0.1,
  restPosition: 0.015,
  restVelocity: 0.08,
  heavyGain: 1.4,
  ground: { frequency: 6, dampingRatio: 0.42, impulse: 170, maxDisplacement: 6 },
  stone: { gravity: 1000, restitution: 0.12, maxGap: 5, landingSpeed: 12 },
  mesh: { columns: 6, rows: 12, maxPixelRatio: 1.5 },
} as const;

export const GRASS_SPRING: SpringConfig = {
  frequency: 3.5, dampingRatio: 0.28, impulse: 470, maxDisplacement: 32,
};
export const HANGING_SPRING: SpringConfig = {
  frequency: 2.6, dampingRatio: 0.3, impulse: 300, maxDisplacement: 28,
};
