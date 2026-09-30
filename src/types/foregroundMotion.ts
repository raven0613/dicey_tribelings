export interface SpringConfig {
  frequency: number;
  dampingRatio: number;
  impulse: number;
  maxDisplacement: number;
}

export interface GrassMotion {
  spring: SpringConfig;
  gain: number;
  direction: readonly [number, number];
  rootX: number;
  rootRadius: number;
  rootBand: number;
  spread: number;
}

export interface HangingMotion {
  spring: SpringConfig;
  gain: number;
  /** Original PNG pixels from the left edge. */
  pivotX: number;
  swing: number;
}

export interface MotionBody { position: number; velocity: number }
