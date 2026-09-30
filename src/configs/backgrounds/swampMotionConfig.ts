import type { GrassMotion, HangingMotion } from '../../types/foregroundMotion';
import { GRASS_SPRING, HANGING_SPRING } from './foregroundMotionConfig';

// One motion field per clump, shared by every leaf; all root measurements are design units.
export const SWAMP_GRASS_MOTION = {
  1: { spring: GRASS_SPRING, gain: 1, direction: [1, 0.12], rootX: 170, rootRadius: 85, rootBand: 0.08, spread: 0.7 },
  2: { spring: { ...GRASS_SPRING, frequency: 3.1 }, gain: 1.1, direction: [-1, 0.04], rootX: 85, rootRadius: 65, rootBand: 0.08, spread: 0.2 },
  3: { spring: { ...GRASS_SPRING, frequency: 4.1 }, gain: 0.55, direction: [1, -0.12], rootX: 40, rootRadius: 30, rootBand: 0.1, spread: 0.5 },
  4: { spring: { ...GRASS_SPRING, frequency: 3.8 }, gain: 0.65, direction: [1, 0.08], rootX: 68, rootRadius: 45, rootBand: 0.1, spread: 0.6 },
  5: { spring: { ...GRASS_SPRING, frequency: 4.4 }, gain: 0.45, direction: [-1, 0.1], rootX: 38, rootRadius: 25, rootBand: 0.1, spread: 0.5 },
  6: { spring: { ...GRASS_SPRING, frequency: 3.6 }, gain: 0.7, direction: [-1, -0.08], rootX: 73, rootRadius: 48, rootBand: 0.1, spread: 0.65 },
  7: { spring: { ...GRASS_SPRING, frequency: 3.3 }, gain: 0.95, direction: [-1, 0.1], rootX: 170, rootRadius: 90, rootBand: 0.08, spread: 0.65 },
} satisfies Record<number, GrassMotion>;

// pivotX is measured in original PNG pixels, independently of the sprite's scene x.
export const SWAMP_HANGING_MOTION = {
  vine1: { spring: HANGING_SPRING, gain: 1, pivotX: 287, swing: 0.45 },
  vine2: { spring: { ...HANGING_SPRING, frequency: 3.1 }, gain: 0.7, pivotX: 205, swing: 0.4 },
  vine3: { spring: { ...HANGING_SPRING, frequency: 2.4 }, gain: -1, pivotX: 16, swing: 0.45 },
  beard1: { spring: { ...HANGING_SPRING, frequency: 3.6 }, gain: 0.35, pivotX: 19, swing: 0.25 },
  beard2: { spring: { ...HANGING_SPRING, frequency: 3.2 }, gain: -0.5, pivotX: 60, swing: 0.3 },
} satisfies Record<string, HangingMotion>;
